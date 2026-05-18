import { type NextRequest, NextResponse } from "next/server";
import { buildIgdbCoverUrls, getTwitchAccessToken } from "@/utils/igdb";
import type { APIResponse, GameResponse, IGDBGameRaw } from "../types";

const IGDB_API_URL = "https://api.igdb.com/v4/games";

function normalizeGameResponse(game: IGDBGameRaw): GameResponse {
  let thumbnailUrl: string | undefined;
  let coverUrl: string | undefined;
  if (game.cover?.url) {
    const urls = buildIgdbCoverUrls(game.cover.url);
    thumbnailUrl = urls.thumbnailUrl;
    coverUrl = urls.coverUrl;
  }

  const genres = game.genres?.map((g) => g.name) || [];

  return {
    id: game.id,
    name: game.name,
    summary: game.summary || "",
    thumbnailUrl,
    coverUrl,
    genres,
    popularity: game.total_rating_count,
  };
}

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<APIResponse<GameResponse[]>>> {
  try {
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Twitch credentials. Ensure CLIENT_ID and CLIENT_SECRET are set in environment variables.",
          statusCode: 500,
        },
        { status: 500 },
      );
    }

    let accessToken: string;
    try {
      accessToken = await getTwitchAccessToken(clientId, clientSecret);
    } catch (authError) {
      const errorMessage =
        authError instanceof Error ? authError.message : "Unknown error";
      console.error("Twitch authentication error:", errorMessage);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to authenticate with Twitch: ${errorMessage}`,
          statusCode: 500,
        },
        { status: 500 },
      );
    }

    // Fixed candidate pool for recommendation ranking.
    const apicalypseQuery = `
      fields id, name, summary, cover.url, cover.width, cover.height, genres.name, total_rating_count;
      where total_rating_count > 150 & summary != null & cover != null;
      sort total_rating_count desc;
      limit 100;
    `;

    const igdbResponse = await fetch(IGDB_API_URL, {
      method: "POST",
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: apicalypseQuery,
    });

    if (!igdbResponse.ok) {
      const errorText = await igdbResponse.text();
      console.error(
        `IGDB API error: ${igdbResponse.status} ${igdbResponse.statusText}`,
        errorText,
      );
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch games from IGDB: ${igdbResponse.statusText}`,
          statusCode: igdbResponse.status,
        },
        { status: igdbResponse.status },
      );
    }

    const games = (await igdbResponse.json()) as IGDBGameRaw[];

    // Defensive filtering to ensure recommendation candidates are complete.
    const normalizedGames: GameResponse[] = games
      .filter(
        (game) =>
          Boolean(game.summary) &&
          Boolean(game.cover?.url) &&
          (game.total_rating_count ?? 0) > 150,
      )
      .map(normalizeGameResponse)
      .slice(0, 100);

    return NextResponse.json(
      {
        success: true,
        data: normalizedGames,
        statusCode: 200,
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error in IGDB candidates route:", errorMessage);
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
