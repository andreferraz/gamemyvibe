import { NextResponse } from "next/server";
import type { APIResponse } from "../../igdb/types";
import { loadDatasetsByPattern } from "../datasetLoader";
import type { CompactGame } from "../types";
import { toCompactGame } from "../utils";

const DISCOVERY_FILE_PATTERN = /^discovery-batch-(\d+)\.json$/;

const MAX_RANDOM_GAMES = 10;

function getGenreSignature(game: CompactGame): string {
  return [...game.g].sort((a, b) => a - b).join(",");
}

function shuffleGames(games: CompactGame[]): CompactGame[] {
  const shuffled = [...games];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

function pickRandomUniqueGenreSetGames(
  games: CompactGame[],
  targetCount: number,
): CompactGame[] {
  const selected: CompactGame[] = [];
  const seenGenreSignatures = new Set<string>();

  for (const game of shuffleGames(games)) {
    const signature = getGenreSignature(game);

    if (seenGenreSignatures.has(signature)) {
      continue;
    }

    seenGenreSignatures.add(signature);
    selected.push(game);

    if (selected.length >= targetCount) {
      break;
    }
  }

  return selected;
}

export async function GET(): Promise<NextResponse<APIResponse<CompactGame[]>>> {
  try {
    const sources = await loadDatasetsByPattern(DISCOVERY_FILE_PATTERN);

    const compactGames = sources
      .flatMap((dataset) => dataset.games)
      .map(toCompactGame) as CompactGame[];

    const randomUniqueGames = pickRandomUniqueGenreSetGames(
      compactGames,
      MAX_RANDOM_GAMES,
    );

    return NextResponse.json(
      {
        success: true,
        data: randomUniqueGames,
        statusCode: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Unexpected error in JSON discovery route:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error: ${errorMessage}`,
        statusCode: 500,
      },
      { status: 500 },
    );
  }
}
