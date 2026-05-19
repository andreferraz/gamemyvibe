import type { UniversalSentenceEncoder } from "@tensorflow-models/universal-sentence-encoder";

import type { GameResponse } from "../app/api/igdb/types";

const candidateEmbeddingCache = new Map<number, number[]>();

export function getCandidateEmbedding(gameId: number) {
  return candidateEmbeddingCache.get(gameId) || null;
}

export function getCandidateEmbeddingCount() {
  return candidateEmbeddingCache.size;
}

export async function preVectorizeCandidateGames(
  model: UniversalSentenceEncoder,
  games: GameResponse[],
) {
  const uncachedGames = games.filter(
    (game) => !candidateEmbeddingCache.has(game.id),
  );

  if (uncachedGames.length === 0) {
    return candidateEmbeddingCache;
  }

  const embeddingInput = uncachedGames.map(
    (game) => game.summary?.trim() || game.name,
  );
  const embeddingsTensor = await model.embed(embeddingInput);

  try {
    const embeddings = (await embeddingsTensor.array()) as number[][];

    embeddings.forEach((embedding, index) => {
      candidateEmbeddingCache.set(uncachedGames[index].id, embedding);
    });

    return candidateEmbeddingCache;
  } finally {
    embeddingsTensor.dispose();
  }
}
