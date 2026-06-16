import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true });

    if (error) {
      console.error('[api/categories] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories', categories: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: data ?? [] });
  } catch (err) {
    console.error('[api/categories] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Internal server error', categories: [] },
      { status: 500 }
    );
  }
}