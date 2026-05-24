#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
const OUTPUT_DIR = resolve(process.cwd(), "tmp");
const LIMIT_PER_REQUEST = 250;
const FETCH_DELAY_MS = 5000;
const RATING_THRESHOLD = 50;
const MIN_RATING_COUNT = 50;

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function getTwitchAccessToken(clientId, clientSecret) {
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
      `Twitch auth failed (${response.status} ${response.statusText})`,
    );
  }

  const data = await response.json();
  const token = String(data?.access_token ?? "").trim();

  if (!token) {
    throw new Error("Twitch auth returned an empty access token.");
  }

  return token;
}

async function igdbPost(url, query, clientId, accessToken) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: query,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `IGDB request failed (${response.status} ${response.statusText}): ${body}`,
    );
  }

  return response.json();
}

async function fetchTopRatedGames(
  clientId,
  accessToken,
  minRatingCount,
  limit,
  offset,
) {
  const query = `
    fields id, name, rating, total_rating_count, first_release_date, genres.id, genres.name, summary, cover.url;
    where rating != null & summary != null & cover.url != null & total_rating_count >= ${minRatingCount} & game_type = 0 & version_parent = null;
    sort rating desc;
    limit ${limit};
    offset ${offset};
  `;

  const games = await igdbPost(IGDB_GAMES_URL, query, clientId, accessToken);

  if (!Array.isArray(games)) {
    throw new Error(
      "Unexpected games payload while fetching global top-rated games.",
    );
  }

  return games.map((game) => ({
    id: game.id,
    name: game.name,
    rating: game.rating,
    totalRatingCount: game.total_rating_count,
    firstReleaseDate: game.first_release_date,
    genres: game.genres,
    summary: game.summary,
    coverUrl: game.cover?.url,
  }));
}

async function run() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: resolve(process.cwd(), ".env") });

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing CLIENT_ID or CLIENT_SECRET environment variables.",
    );
  }

  const accessToken = await getTwitchAccessToken(clientId, clientSecret);

  let offset = 0;
  let requestLimit = LIMIT_PER_REQUEST;
  let requestCount = 0;
  let totalGames = 0;

  await mkdir(OUTPUT_DIR, { recursive: true });

  while (true) {
    if (requestCount > 0) {
      await sleep(FETCH_DELAY_MS);
    }

    console.log(
      `Fetching top-rated games (offset=${offset}, limit=${requestLimit})...`,
    );

    const batch = await fetchTopRatedGames(
      clientId,
      accessToken,
      MIN_RATING_COUNT,
      requestLimit,
      offset,
    );

    requestCount += 1;

    if (batch.length === 0) {
      break;
    }

    const filteredBatch = batch.filter(
      (game) => Number(game.rating) > RATING_THRESHOLD,
    );
    totalGames += filteredBatch.length;

    // Save each batch as a separate file
    const batchPath = resolve(
      OUTPUT_DIR,
      `top-rated-global-batch-${requestCount}.json`,
    );
    await writeFile(
      batchPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source: "IGDB /v4/games",
          ratingThreshold: RATING_THRESHOLD,
          minRatingCount: MIN_RATING_COUNT,
          requestCount,
          offset,
          batchSize: filteredBatch.length,
          games: filteredBatch,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(
      `Saved batch ${requestCount} (${filteredBatch.length} games) to ${batchPath}`,
    );

    const lastBatchItem = batch[batch.length - 1];
    const lastBatchRating = Number(lastBatchItem?.rating ?? 0);
    const hasFullBatch = batch.length === requestLimit;

    if (!hasFullBatch || lastBatchRating <= RATING_THRESHOLD) {
      break;
    }

    offset += batch.length;
    requestLimit = LIMIT_PER_REQUEST;

    console.log(
      `Last rating ${lastBatchRating.toFixed(2)} is above ${RATING_THRESHOLD}; fetching ${LIMIT_PER_REQUEST} more...`,
    );
  }

  console.log(
    `Saved ${totalGames} games in ${requestCount} batch file(s) in ${OUTPUT_DIR}`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Global top-rated collection failed: ${message}`);
  process.exitCode = 1;
});
