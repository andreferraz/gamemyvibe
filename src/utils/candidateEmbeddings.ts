import type { UniversalSentenceEncoder } from "@tensorflow-models/universal-sentence-encoder";

import type { GameResponse } from "../app/api/igdb/types";

const candidateEmbeddingCache = new Map<number, number[]>();
const DEFAULT_BATCH_SIZE = 24;
const DEFAULT_YIELD_EVERY_BATCHES = 1;

interface PreVectorizeOptions {
  batchSize?: number;
  yieldEveryBatches?: number;
  yieldMs?: number;
  onProgress?: (progress: { processed: number; total: number }) => void;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getCandidateEmbedding(gameId: number) {
  return candidateEmbeddingCache.get(gameId) || null;
}

export function getCandidateEmbeddingCount() {
  return candidateEmbeddingCache.size;
}

export async function preVectorizeCandidateGames(
  model: UniversalSentenceEncoder,
  games: GameResponse[],
  options: PreVectorizeOptions = {},
) {
  const batchSize = Math.max(
    1,
    Math.floor(options.batchSize ?? DEFAULT_BATCH_SIZE),
  );
  const yieldEveryBatches = Math.max(
    1,
    Math.floor(options.yieldEveryBatches ?? DEFAULT_YIELD_EVERY_BATCHES),
  );
  const yieldMs = Math.max(0, Math.floor(options.yieldMs ?? 0));

  const uncachedGames = games.filter(
    (game) => !candidateEmbeddingCache.has(game.id),
  );

  if (uncachedGames.length === 0) {
    options.onProgress?.({ processed: 0, total: 0 });
    return candidateEmbeddingCache;
  }

  let processed = 0;
  options.onProgress?.({ processed, total: uncachedGames.length });

  for (let start = 0; start < uncachedGames.length; start += batchSize) {
    const batchIndex = Math.floor(start / batchSize);
    const chunk = uncachedGames.slice(start, start + batchSize);
    const embeddingInput = chunk.map(
      (game) => game.summary?.trim() || game.name,
    );
    const embeddingsTensor = await model.embed(embeddingInput);

    try {
      const embeddings = (await embeddingsTensor.array()) as number[][];

      embeddings.forEach((embedding, index) => {
        candidateEmbeddingCache.set(chunk[index].id, embedding);
      });

      processed += chunk.length;
      options.onProgress?.({ processed, total: uncachedGames.length });
    } finally {
      embeddingsTensor.dispose();
    }

    if ((batchIndex + 1) % yieldEveryBatches === 0) {
      await sleep(yieldMs);
    }
  }

  return candidateEmbeddingCache;
}
