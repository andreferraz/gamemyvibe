import type { FormattedGameObject } from "@/app/api/json/types";
import {
  getCandidateEmbedding,
  preVectorizeCandidateGames,
} from "@/utils/candidateEmbeddings";
import { rankByCosineSimilarity } from "@/utils/profileInference";
import {
  embedText,
  loadUniversalSentenceEncoder,
} from "@/utils/universalSentenceEncoder";
import type {
  DescribeExperienceWorkerRequest,
  DescribeExperienceWorkerResponse,
} from "./describeExperienceWorker.types";

const PROGRESS_EMIT_INTERVAL_MS = 100;

let candidateGames: FormattedGameObject[] = [];
let isReady = false;

async function initializeWorker(games: FormattedGameObject[]) {
  const model = await loadUniversalSentenceEncoder();
  let lastProgressSentAt = 0;

  const emitProgress = (processed: number, total: number) => {
    const now = Date.now();
    const isComplete = total > 0 && processed >= total;

    if (!isComplete && now - lastProgressSentAt < PROGRESS_EMIT_INTERVAL_MS) {
      return;
    }

    lastProgressSentAt = now;
    const percent = total > 0 ? Math.round((processed / total) * 100) : 100;

    self.postMessage({
      type: "init-progress",
      processed,
      total,
      percent,
    } satisfies DescribeExperienceWorkerResponse);
  };

  await preVectorizeCandidateGames(model, games, {
    batchSize: 16,
    yieldEveryBatches: 1,
    yieldMs: 8,
    onProgress: ({ processed, total }) => {
      emitProgress(processed, total);
    },
  });
  candidateGames = games;
  isReady = true;

  emitProgress(candidateGames.length, candidateGames.length);
}

async function searchGames(query: string, limit: number) {
  const model = await loadUniversalSentenceEncoder();
  const queryEmbedding = await embedText(model, query);
  const rankedCandidates = candidateGames
    .map((game) => {
      const embedding = getCandidateEmbedding(game.id);
      return embedding ? { item: game, embedding } : null;
    })
    .filter(
      (
        candidate,
      ): candidate is {
        item: FormattedGameObject;
        embedding: number[];
      } => Boolean(candidate),
    );

  return rankByCosineSimilarity(queryEmbedding, rankedCandidates, limit).map(
    (result) => ({
      ...result.item,
      similarity: result.similarity,
    }),
  );
}

self.addEventListener(
  "message",
  async (event: MessageEvent<DescribeExperienceWorkerRequest>) => {
    const message = event.data;

    if (message.type === "init") {
      try {
        await initializeWorker(message.games);
        self.postMessage({
          type: "init-complete",
        } satisfies DescribeExperienceWorkerResponse);
      } catch (error) {
        self.postMessage({
          type: "error",
          stage: "init",
          message: error instanceof Error ? error.message : String(error),
        } satisfies DescribeExperienceWorkerResponse);
      }

      return;
    }

    if (message.type === "search") {
      if (!isReady) {
        self.postMessage({
          type: "error",
          stage: "search",
          message: "Worker is not ready yet.",
          requestId: message.requestId,
        } satisfies DescribeExperienceWorkerResponse);
        return;
      }

      try {
        const results = await searchGames(message.query, message.limit);

        self.postMessage({
          type: "search-results",
          requestId: message.requestId,
          results,
        } satisfies DescribeExperienceWorkerResponse);
      } catch (error) {
        self.postMessage({
          type: "error",
          stage: "search",
          message: error instanceof Error ? error.message : String(error),
          requestId: message.requestId,
        } satisfies DescribeExperienceWorkerResponse);
      }
    }
  },
);
