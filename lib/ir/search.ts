import { supabase } from '@/lib/supabase/client';
import { getEmbedding } from './embeddings';
import type { SearchFilters, MenuItemResult, SearchMode } from './types';

const DEFAULT_LIMIT = 20;
const FUZZY_SIMILARITY_THRESHOLD = 0.2;
const SEMANTIC_MATCH_THRESHOLD = 0.3;

interface RpcCommonArgs {
  filter_category: string[] | null;
  filter_vegan: boolean | null;
  filter_gf: boolean | null;
  match_limit: number;
}

function buildCommonArgs(filters: SearchFilters): RpcCommonArgs {
  return {
    filter_category:
      filters.categories && filters.categories.length > 0
        ? filters.categories
        : null,
    filter_vegan: filters.isVegan === true ? true : null,
    filter_gf: filters.isGlutenFree === true ? true : null,
    match_limit: DEFAULT_LIMIT,
  };
}

/**
 * LEXICAL SEARCH
 * Calls search_menu_lexical, which uses websearch_to_tsquery + ts_rank.
 * Handles tokenization, stemming, and stop-word removal via the
 * 'english' tsvector configuration.
 */
async function runLexicalSearch(
  query: string,
  common: RpcCommonArgs
): Promise<MenuItemResult[]> {
  const { data, error } = await supabase.rpc('search_menu_lexical', {
    search_query: query,
    ...common,
  });

  if (error) {
    console.error('[search] Lexical search error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    score: row.rank,
    score_type: 'rank' as const,
  }));
}

/**
 * FUZZY (TRIGRAM) SEARCH
 * Calls search_menu_fuzzy, which uses pg_trgm similarity() and the
 * % operator for typo-tolerant matching.
 */
async function runFuzzySearch(
  query: string,
  common: RpcCommonArgs
): Promise<MenuItemResult[]> {
  const { data, error } = await supabase.rpc('search_menu_fuzzy', {
    search_query: query,
    similarity_threshold: FUZZY_SIMILARITY_THRESHOLD,
    ...common,
  });

  if (error) {
    console.error('[search] Fuzzy search error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    score: row.similarity_score,
    score_type: 'similarity_score' as const,
  }));
}

/**
 * SEMANTIC (VECTOR) SEARCH
 * Embeds the query locally via a transformer model, then calls
 * search_menu_semantic, which ranks by cosine similarity
 * (1 - cosine_distance) using pgvector.
 */
async function runSemanticSearch(
  query: string,
  common: RpcCommonArgs
): Promise<MenuItemResult[]> {
  const embedding = await getEmbedding(query);

  const { data, error } = await supabase.rpc('search_menu_semantic', {
    query_embedding: embedding,
    match_threshold: SEMANTIC_MATCH_THRESHOLD,
    ...common,
  });

  if (error) {
    console.error('[search] Semantic search error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    score: row.similarity,
    score_type: 'similarity' as const,
  }));
}

/**
 * MAIN ORCHESTRATOR
 *
 * Routing logic:
 * - 'lexical'  -> ts_rank full-text search
 * - 'fuzzy'    -> trigram similarity search
 * - 'semantic' -> embedding + cosine similarity search
 *
 * AUTO-FALLBACK: If mode is 'lexical' and zero results are returned
 * (e.g. the query has a typo and stemming/tokenization finds nothing),
 * automatically fall back to fuzzy trigram matching.
 */
export async function searchMenu(
  filters: SearchFilters
): Promise<{ results: MenuItemResult[]; effectiveMode: SearchMode }> {
  const trimmedQuery = filters.query.trim();
  const common = buildCommonArgs(filters);

  // Empty query: return filtered items without ranking (browse mode)
  if (trimmedQuery.length === 0) {
    const { data, error } = await supabase
      .from('menu_items')
      .select(
        'id, category_id, name, description, price, ingredients, is_vegan, is_gluten_free, image_url'
      )
      .match(
        Object.fromEntries(
          Object.entries({
            is_vegan: filters.isVegan === true ? true : undefined,
            is_gluten_free: filters.isGlutenFree === true ? true : undefined,
          }).filter(([, v]) => v !== undefined)
        )
      )
      .limit(DEFAULT_LIMIT);

    if (error) {
      console.error('[search] Browse query error:', error);
      return { results: [], effectiveMode: filters.mode };
    }

    const filtered =
      filters.categories && filters.categories.length > 0
        ? (data ?? []).filter((row: any) =>
            filters.categories!.includes(row.category_id)
          )
        : data ?? [];

    return {
      results: filtered.map((row: any) => ({
        ...row,
        score: 0,
        score_type: 'rank' as const,
      })),
      effectiveMode: filters.mode,
    };
  }

  switch (filters.mode) {
    case 'lexical': {
      const lexicalResults = await runLexicalSearch(trimmedQuery, common);

      if (lexicalResults.length === 0) {
        const fuzzyFallback = await runFuzzySearch(trimmedQuery, common);
        return { results: fuzzyFallback, effectiveMode: 'fuzzy' };
      }

      return { results: lexicalResults, effectiveMode: 'lexical' };
    }

    case 'fuzzy': {
      const fuzzyResults = await runFuzzySearch(trimmedQuery, common);
      return { results: fuzzyResults, effectiveMode: 'fuzzy' };
    }

    case 'semantic': {
      const semanticResults = await runSemanticSearch(trimmedQuery, common);
      return { results: semanticResults, effectiveMode: 'semantic' };
    }

    default: {
      const _exhaustive: never = filters.mode;
      throw new Error(`Unknown search mode: ${_exhaustive}`);
    }
  }
}