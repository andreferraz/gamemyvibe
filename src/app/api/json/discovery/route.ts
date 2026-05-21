import { NextResponse } from "next/server";
import discoveryGames1 from "@/data/json/discovery-batch-1.json";
import discoveryGames2 from "@/data/json/discovery-batch-2.json";
import discoveryGames3 from "@/data/json/discovery-batch-3.json";
import discoveryGames4 from "@/data/json/discovery-batch-4.json";
import discoveryGames5 from "@/data/json/discovery-batch-5.json";
import discoveryGames6 from "@/data/json/discovery-batch-6.json";
import discoveryGames7 from "@/data/json/discovery-batch-7.json";
import type { APIResponse } from "../../igdb/types";
import type { CompactGame, RawGameObject } from "../types";
import { toCompactGame } from "../utils";

export interface GamesDataset {
  games: RawGameObject[];
}

const SOURCES: GamesDataset[] = [
  discoveryGames1,
  discoveryGames2,
  discoveryGames3,
  discoveryGames4,
  discoveryGames5,
  discoveryGames6,
  discoveryGames7,
];

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
    const compactGames = SOURCES.flatMap((dataset) => dataset.games).map(
      toCompactGame,
    ) as CompactGame[];

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
