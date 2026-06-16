import { createClient } from '@supabase/supabase-js';
import { getEmbedding } from '../lib/ir/embeddings';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, description');

  if (error) {
    console.error('Failed to fetch items:', error);
    process.exit(1);
  }

  for (const item of items ?? []) {
    const text = `${item.name}. ${item.description}`;
    console.log(`Embedding: ${item.name}`);

    const embedding = await getEmbedding(text);

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ embedding })
      .eq('id', item.id);

    if (updateError) {
      console.error(`Failed to update ${item.name}:`, updateError);
    } else {
      console.log(`✓ ${item.name}`);
    }
  }

  console.log('Done.');
}

main();