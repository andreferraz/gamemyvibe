import { NextResponse } from "next/server";
import topRated1 from "@/data/json/top-rated-1.json";
import topRated2 from "@/data/json/top-rated-2.json";
import topRated3 from "@/data/json/top-rated-3.json";
import topRated4 from "@/data/json/top-rated-4.json";
import topRated5 from "@/data/json/top-rated-5.json";
import topRated6 from "@/data/json/top-rated-6.json";
import topRated7 from "@/data/json/top-rated-7.json";
import topRated8 from "@/data/json/top-rated-8.json";
import topRated9 from "@/data/json/top-rated-9.json";
import topRated10 from "@/data/json/top-rated-10.json";
import topRated11 from "@/data/json/top-rated-11.json";
import topRated12 from "@/data/json/top-rated-12.json";
import type { APIResponse } from "../../igdb/types";
import type { CompactGame, RawGameObject } from "../types";
import { toCompactGame } from "../utils";

export interface GamesDataset {
  games: RawGameObject[];
}

const MAX_LIMIT = 1500;

const SOURCES: GamesDataset[] = [
  topRated1,
  topRated2,
  topRated3,
  topRated4,
  topRated5,
  topRated6,
  topRated7,
  topRated8,
  topRated9,
  topRated10,
  topRated11,
  topRated12,
];

export async function GET(): Promise<NextResponse<APIResponse<CompactGame[]>>> {
  try {
    const compactGames = SOURCES.flatMap((dataset) => dataset.games)
      .slice(0, MAX_LIMIT)
      .map(toCompactGame) as CompactGame[];

    return NextResponse.json(
      {
        success: true,
        data: compactGames,
        statusCode: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("Unexpected error in JSON candidates route:", errorMessage);

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
