#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";
const GENRES_INPUT_PATH = resolve(process.cwd(), "tmp/all-genres.json");
const OUTPUT_DIR = resolve(process.cwd(), "tmp");
const TOP_PER_GENRE = 100;
const ADDITIONAL_PER_GENRE = 100;
const FETCH_DELAY_MS = 5000;
const RATING_THRESHOLD = 75;

function toPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function toFileSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
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

async function readGenresFromFile() {
  const raw = await readFile(GENRES_INPUT_PATH, "utf8");
  const payload = JSON.parse(raw);
  const genres = payload?.genres;

  if (!Array.isArray(genres)) {
    throw new Error("Genre file does not contain a valid genres array.");
  }

  const normalized = genres
    .filter(
      (genre) => Number.isInteger(genre?.id) && typeof genre?.name === "string",
    )
    .map((genre) => ({
      id: genre.id,
      name: genre.name.trim(),
    }))
    .filter((genre) => genre.name.length > 0);

  if (normalized.length === 0) {
    throw new Error("No valid genres found in tmp/all-genres.json.");
  }

  return normalized;
}

async function fetchTopGamesByGenre(
  genre,
  clientId,
  accessToken,
  minRatingCount,
  limit,
  offset,
) {
  const query = `
    fields id, name, rating, total_rating_count, first_release_date, genres.id, genres.name, summary, cover.url;
    where genres = (${genre.id}) & rating != null & summary != null & cover.url != null & total_rating_count >= ${minRatingCount};
    sort rating desc;
    limit ${limit};
    offset ${offset};
  `;

  const games = await igdbPost(IGDB_GAMES_URL, query, clientId, accessToken);

  if (!Array.isArray(games)) {
    throw new Error(`Unexpected games payload for genre ${genre.name}.`);
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
  // Load local env files for standalone script execution without overriding shell env.
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: resolve(process.cwd(), ".env") });

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing CLIENT_ID or CLIENT_SECRET environment variables.",
    );
  }

  const minRatingCount = toPositiveInteger(process.env.MIN_RATING_COUNT, 50);
  const accessToken = await getTwitchAccessToken(clientId, clientSecret);
  const genres = await readGenresFromFile();

  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const [index, genre] of genres.entries()) {
    console.log(
      `[${index + 1}/${genres.length}] Fetching top ${TOP_PER_GENRE} for ${genre.name}...`,
    );

    const games = [];
    let offset = 0;
    let requestLimit = TOP_PER_GENRE;
    let requestCount = 0;

    while (true) {
      if (requestCount > 0) {
        await sleep(FETCH_DELAY_MS);
      }

      const batch = await fetchTopGamesByGenre(
        genre,
        clientId,
        accessToken,
        minRatingCount,
        requestLimit,
        offset,
      );

      requestCount += 1;

      if (batch.length === 0) {
        break;
      }

      games.push(
        ...batch.filter((game) => Number(game.rating) > RATING_THRESHOLD),
      );

      const lastBatchItem = batch[batch.length - 1];
      const lastBatchRating = Number(lastBatchItem?.rating ?? 0);
      const hasFullBatch = batch.length === requestLimit;

      if (!hasFullBatch || lastBatchRating <= RATING_THRESHOLD) {
        break;
      }

      offset += batch.length;
      requestLimit = ADDITIONAL_PER_GENRE;

      console.log(
        `Last rating ${lastBatchRating.toFixed(2)} is above ${RATING_THRESHOLD}; fetching ${ADDITIONAL_PER_GENRE} more for ${genre.name}...`,
      );
    }

    const outputPath = resolve(
      OUTPUT_DIR,
      `top-rated-${String(genre.id)}-${toFileSlug(genre.name)}.json`,
    );

    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          source: "IGDB /v4/games",
          genre,
          topPerGenre: TOP_PER_GENRE,
          additionalPerGenre: ADDITIONAL_PER_GENRE,
          ratingThreshold: RATING_THRESHOLD,
          minRatingCount,
          requestCount,
          totalGames: games.length,
          games,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(`Saved ${games.length} games to ${outputPath}`);

    if (index < genres.length - 1) {
      await sleep(FETCH_DELAY_MS);
    }
  }

  console.log(
    `Completed ${genres.length} genres using ${GENRES_INPUT_PATH}. Wrote output files to ${OUTPUT_DIR}.`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Top-rated genre collection failed: ${message}`);
  process.exitCode = 1;
});
