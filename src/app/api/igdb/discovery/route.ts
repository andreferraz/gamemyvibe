import { type NextRequest, NextResponse } from "next/server";
import { IGDB_GAME_GENRES } from "@/json/genres";
import { buildIgdbCoverUrls, getTwitchAccessToken } from "@/utils/igdb";
import type { APIResponse, GameResponse, IGDBGameRaw } from "../types";

const IGDB_API_URL = "https://api.igdb.com/v4/games";
const DISCOVERY_BATCH_SIZE = 5; // batch size per genre query, but we will pick 10 unique games for the discovery phase
const MAX_CONCURRENT_DISCOVERY_QUERIES = 10;
const MIN_RATING_COUNT = 50;
const MAX_RATING_COUNT = 300;

function shuffleArray<T>(values: T[]): T[] {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function buildGenreDiscoveryQuery(genreId: number, genreName: string) {
  return `query games "${genreName}" {
      fields id, name, summary, cover.url, cover.width, cover.height, genres.name, total_rating_count;
      where genres = (${genreId}) & total_rating_count > ${MIN_RATING_COUNT} & total_rating_count < ${MAX_RATING_COUNT} & summary != null & cover != null;
      sort total_rating_count desc;
      limit ${DISCOVERY_BATCH_SIZE};
    };`;
}

function normalizeGameResponse(game: IGDBGameRaw): GameResponse {
  // Keep both original thumbnail and a larger cover URL variant.
  let thumbnailUrl: string | undefined;
  let coverUrl: string | undefined;
  if (game.cover?.url) {
    const urls = buildIgdbCoverUrls(game.cover.url);
    thumbnailUrl = urls.thumbnailUrl;
    coverUrl = urls.coverUrl;
  }

  // Extract genre names
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

function normalizeMultiQueryResult(
  value: IGDBGameRaw[] | IGDBGameRaw[][],
): IGDBGameRaw[][] {
  if (Array.isArray(value[0])) {
    return value as IGDBGameRaw[][];
  }

  if (value.length === 0) {
    return [];
  }

  return [value as IGDBGameRaw[]];
}

function pickDiscoveryGames(discoveryBatches: IGDBGameRaw[][]): GameResponse[] {
  const usedGameIds = new Set<number>();
  const picked: GameResponse[] = [];

  // Flatten and shuffle all games from all batches
  const allGames = shuffleArray(discoveryBatches.flat());
  for (const game of allGames) {
    if (
      picked.length >= 10 ||
      !game.summary ||
      !game.cover?.url ||
      (game.total_rating_count ?? 0) <= MIN_RATING_COUNT ||
      (game.total_rating_count ?? 0) >= MAX_RATING_COUNT ||
      usedGameIds.has(game.id)
    ) {
      continue;
    }
    picked.push(normalizeGameResponse(game));
    usedGameIds.add(game.id);
    if (picked.length >= 10) break;
  }
  return picked;
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

    const discoveryGenres = shuffleArray(IGDB_GAME_GENRES);
    const discoveryBatches: IGDBGameRaw[][] = [];

    for (
      let index = 0;
      index < discoveryGenres.length;
      index += MAX_CONCURRENT_DISCOVERY_QUERIES
    ) {
      const currentGenres = discoveryGenres.slice(
        index,
        index + MAX_CONCURRENT_DISCOVERY_QUERIES,
      );
      const apicalypseQuery = currentGenres
        .map((genre) => buildGenreDiscoveryQuery(genre.id, genre.name))
        .join("\n");

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

      const games = (await igdbResponse.json()) as
        | IGDBGameRaw[]
        | IGDBGameRaw[][];

      discoveryBatches.push(...normalizeMultiQueryResult(games));
    }

    const normalizedGames = pickDiscoveryGames(discoveryBatches);

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
