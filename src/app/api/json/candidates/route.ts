import { NextResponse } from "next/server";
import type { APIResponse } from "../../igdb/types";
import { loadDatasetsByPattern } from "../datasetLoader";
import type { CompactGame } from "../types";
import { toCompactGame } from "../utils";

const MAX_LIMIT = 250;
const TOP_RATED_FILE_PATTERN = /^top-rated-resume-batch-(\d+)\.json$/;

export async function GET(): Promise<NextResponse<APIResponse<CompactGame[]>>> {
  try {
    const sources = await loadDatasetsByPattern(TOP_RATED_FILE_PATTERN);

    const compactGames = sources
      .flatMap((dataset) => dataset.games)
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
