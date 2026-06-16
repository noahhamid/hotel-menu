import { NextRequest, NextResponse } from 'next/server';
import { searchMenu } from '@/lib/ir/search';
import type { SearchMode, SearchFilters } from '@/lib/ir/types';

const VALID_MODES: SearchMode[] = ['lexical', 'fuzzy', 'semantic'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') ?? '';

    const modeParam = searchParams.get('mode') ?? 'lexical';
    const mode: SearchMode = VALID_MODES.includes(modeParam as SearchMode)
      ? (modeParam as SearchMode)
      : 'lexical';

    const categoriesParam = searchParams.get('categories');
    const categories = categoriesParam
      ? categoriesParam.split(',').filter(Boolean)
      : undefined;

    const isVegan = searchParams.get('vegan') === 'true' ? true : undefined;
    const isGlutenFree =
      searchParams.get('glutenFree') === 'true' ? true : undefined;

    const filters: SearchFilters = {
      query,
      mode,
      categories,
      isVegan,
      isGlutenFree,
    };

    const { results, effectiveMode } = await searchMenu(filters);

    return NextResponse.json({
      results,
      effectiveMode,
      requestedMode: mode,
      fallbackTriggered: effectiveMode !== mode,
      count: results.length,
    });
  } catch (err) {
    console.error('[api/search] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', results: [], count: 0 },
      { status: 500 }
    );
  }
}