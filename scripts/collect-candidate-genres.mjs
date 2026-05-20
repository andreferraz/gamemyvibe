#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.CANDIDATES_BASE_URL ?? "http://localhost:3000";
const endpoint = new URL("/api/igdb/candidates?limit=500", baseUrl).toString();
const outputPath = resolve(process.cwd(), "tmp/candidate-genres.json");

function normalizeGenreDetails(payloadData) {
  const genreMap = new Map();

  for (const game of payloadData) {
    const details = Array.isArray(game.genreDetails) ? game.genreDetails : [];
    const seenGenreIds = new Set();

    for (const genre of details) {
      const id = Number(genre?.id);
      const name = String(genre?.name ?? "").trim();

      if (!Number.isInteger(id) || id <= 0 || !name || seenGenreIds.has(id)) {
        continue;
      }

      seenGenreIds.add(id);

      if (genreMap.has(id)) {
        const existingGenre = genreMap.get(id);
        genreMap.set(id, {
          ...existingGenre,
          gameCount: existingGenre.gameCount + 1,
        });
        continue;
      }

      genreMap.set(id, { id, name, gameCount: 1 });
    }
  }

  return [...genreMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function run() {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch candidates (${response.status} ${response.statusText}): ${body}`,
    );
  }

  const payload = await response.json();

  if (!payload?.success || !Array.isArray(payload?.data)) {
    throw new Error("Candidates API returned an unexpected response shape.");
  }

  const genres = normalizeGenreDetails(payload.data);

  await mkdir(resolve(process.cwd(), "tmp"), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        source: endpoint,
        generatedAt: new Date().toISOString(),
        totalGenres: genres.length,
        genres,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Saved ${genres.length} genres to ${outputPath}`);
  console.log(
    genres
      .map((genre) => `${genre.id}: ${genre.name} (${genre.gameCount} games)`)
      .join("\n"),
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Genre collection failed: ${message}`);
  process.exitCode = 1;
});
