import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

const EMBEDDING_DIMENSIONS = 384;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedderPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getEmbedder(): Promise<any> {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return embedderPromise;
}

/**
 * Generates a real semantic embedding using a local transformer model
 * (all-MiniLM-L6-v2, 384 dimensions). Fully free, runs in-process.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const embedder = await getEmbedder();
    const output = await embedder(text, { pooling: 'mean', normalize: true });

    const embedding: number[] = Array.from(output.data as Float32Array);

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding length: ${embedding.length}`);
    }

    return embedding;
  } catch (err) {
    console.error('[embeddings] Local model failed:', err);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}