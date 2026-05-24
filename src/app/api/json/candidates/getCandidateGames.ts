import "server-only";
import { loadDatasetsByPattern } from "../datasetLoader";
import type { CompactGame } from "../types";
import { toCompactGame } from "../utils";

const MAX_LIMIT = 500;
const TOP_RATED_FILE_PATTERN = /^top-rated-resume-batch-(\d+)\.json$/;

export async function getCandidateGames(): Promise<CompactGame[]> {
  const sources = await loadDatasetsByPattern(TOP_RATED_FILE_PATTERN);

  return sources
    .flatMap((dataset) => dataset.games)
    .slice(0, MAX_LIMIT)
    .map(toCompactGame) as CompactGame[];
}
