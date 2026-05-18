import { type NextRequest, NextResponse } from "next/server";
import type { APIResponse, GameResponse, IGDBGameRaw } from "../types";

// Twitch OAuth token endpoint
const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4/games";

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_AUTH_URL}?${params.toString()}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Twitch authentication failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as TwitchTokenResponse;
  return data.access_token;
}

function normalizeGameResponse(game: IGDBGameRaw): GameResponse {
  // Extract cover URL, handling Twitch image URL format
  let coverUrl: string | undefined;
  if (game.cover?.url) {
    // IGDB returns URLs like //images.igdb.com/..., prepend https:
    coverUrl = game.cover.url.startsWith("http")
      ? game.cover.url
      : `https:${game.cover.url}`;
  }

  // Extract genre names
  const genres = game.genres?.map((g) => g.name) || [];

  return {
    id: game.id,
    name: game.name,
    summary: game.summary || "",
    coverUrl,
    genres,
    popularity: game.total_rating_count,
  };
}

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<APIResponse<GameResponse[]>>> {
  try {
    // Validate environment variables
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

    // Get Twitch access token
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

    // Build Apicalypse query for IGDB
    // Request top 10 games sorted by total_rating_count (popularity)
    // Only include games with summary (description)
    const apicalypseQuery = `
      fields id, name, summary, cover.url, cover.width, cover.height, genres.name, total_rating_count;
      where summary != null;
      sort total_rating_count desc;
      limit 10;
    `;

    // Make request to IGDB API
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

    // Filter and normalize response
    const normalizedGames: GameResponse[] = games
      .filter((game) => game.summary) // Ensure summary exists (extra safety)
      .map(normalizeGameResponse);

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
    console.error("Unexpected error in IGDB API route:", errorMessage);
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
