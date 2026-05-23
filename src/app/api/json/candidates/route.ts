import { NextResponse } from "next/server";
import type { APIResponse, CompactGame } from "../types";
import { getCandidateGames } from "./getCandidateGames";

export async function GET(): Promise<NextResponse<APIResponse<CompactGame[]>>> {
  try {
    const compactGames = await getCandidateGames();

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
