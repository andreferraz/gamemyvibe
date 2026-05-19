#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.CANDIDATES_BASE_URL ?? "http://localhost:3000";
const endpoint = new URL("/api/igdb/candidates?limit=500", baseUrl).toString();
const outputPath = resolve(process.cwd(), "tmp/candidate-genres.json");

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

  const genres = [...new Set(payload.data.flatMap((game) => game.genres ?? []))]
    .map((genre) => String(genre).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

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
  console.log(genres.join("\n"));
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Genre collection failed: ${message}`);
  process.exitCode = 1;
});
