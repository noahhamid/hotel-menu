const EMBEDDING_DIMENSIONS = 384;
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

/**
 * Deterministic fallback embedding, used only if the Hugging Face API
 * is unreachable or no API key is configured. Not semantically
 * meaningful — purely keeps the app functional without crashing.
 */
function generateMockEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  let seed = 0;
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) % 100000;
  }
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    vector[i] = (seed / 233280) * 0.1;
  }
  return vector;
}

/**
 * Generates a real semantic embedding using Hugging Face's free
 * hosted Inference API (sentence-transformers/all-MiniLM-L6-v2,
 * 384 dimensions). No native binaries, works on Vercel serverless.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!apiKey) {
    console.warn('[embeddings] HUGGINGFACE_API_KEY not set — using mock fallback.');
    return generateMockEmbedding(text);
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[embeddings] Hugging Face API error:', response.status, errorBody);
      return generateMockEmbedding(text);
    }

    const data = await response.json();

    // The feature-extraction pipeline returns a flat array of 384 numbers
    // for sentence-transformers models with mean pooling already applied.
    let embedding: number[];

    if (Array.isArray(data) && typeof data[0] === 'number') {
      embedding = data;
    } else if (Array.isArray(data) && Array.isArray(data[0])) {
      // Some model configs return [tokens][dims] — mean-pool manually
      const tokenVectors = data[0] as number[][];
      embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
      for (const tokenVec of tokenVectors) {
        for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
          embedding[i] += tokenVec[i];
        }
      }
      for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
        embedding[i] /= tokenVectors.length;
      }
    } else {
      throw new Error('Unexpected response shape from Hugging Face API');
    }

    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Unexpected embedding length: ${embedding.length}`);
    }

    return embedding;
  } catch (err) {
    console.error('[embeddings] Hugging Face request failed, using mock fallback:', err);
    return generateMockEmbedding(text);
  }
}