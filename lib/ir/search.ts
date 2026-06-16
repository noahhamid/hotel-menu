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
      filters.categories && filters.categories.length > 0 ? filters.categories : null,
    filter_vegan: filters.isVegan === true ? true : null,
    filter_gf: filters.isGlutenFree === true ? true : null,
    match_limit: DEFAULT_LIMIT,
  };
}

async function runLexicalSearch(query: string, common: RpcCommonArgs): Promise<MenuItemResult[]> {
  const { data, error } = await supabase.rpc('search_menu_lexical', { search_query: query, ...common });
  if (error) {
    console.error('[search] Lexical search error:', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({ ...row, score: row.rank, score_type: 'rank' as const }));
}

async function runFuzzySearch(query: string, common: RpcCommonArgs): Promise<MenuItemResult[]> {
  const { data, error } = await supabase.rpc('search_menu_fuzzy', {
    search_query: query,
    similarity_threshold: FUZZY_SIMILARITY_THRESHOLD,
    ...common,
  });
  if (error) {
    console.error('[search] Fuzzy search error:', error);
    return [];
  }
  return (data ?? []).map((row: any) => ({ ...row, score: row.similarity_score, score_type: 'similarity_score' as const }));
}

async function runSemanticSearch(query: string, common: RpcCommonArgs): Promise<MenuItemResult[]> {
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
  return (data ?? []).map((row: any) => ({ ...row, score: row.similarity, score_type: 'similarity' as const }));
}

export async function searchMenu(
  filters: SearchFilters
): Promise<{ results: MenuItemResult[]; effectiveMode: SearchMode }> {
  const trimmedQuery = filters.query.trim();
  const common = buildCommonArgs(filters);

  if (trimmedQuery.length === 0) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, category_id, name, description, price, ingredients, is_vegan, is_gluten_free, image_url')
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
        ? (data ?? []).filter((row: any) => filters.categories!.includes(row.category_id))
        : data ?? [];

    return {
      results: filtered.map((row: any) => ({ ...row, score: 0, score_type: 'rank' as const })),
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
    case 'fuzzy':
      return { results: await runFuzzySearch(trimmedQuery, common), effectiveMode: 'fuzzy' };
    case 'semantic':
      return { results: await runSemanticSearch(trimmedQuery, common), effectiveMode: 'semantic' };
    default: {
      const _exhaustive: never = filters.mode;
      throw new Error(`Unknown search mode: ${_exhaustive}`);
    }
  }
}