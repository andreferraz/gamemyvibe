#!/usr/bin/env node

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

const DATA_DIR = resolve(process.cwd(), "src/data/json");
const RESULTS_DIR = resolve(DATA_DIR, "results/pt");
const OUTPUT_DIR = resolve(DATA_DIR, "top-rated-resume-batches/pt");
const BATCH_SIZE = 100;

function extractTopRatedIndex(fileName) {
  const match = fileName.match(/^top-rated-(\d+)\.json$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function normalizeTopRatedFileName(fileSelector) {
  const raw = String(fileSelector ?? "").trim();

  if (!raw) {
    return null;
  }

  if (/^top-rated-\d+\.json$/.test(raw)) {
    return raw;
  }

  if (/^\d+$/.test(raw)) {
    return `top-rated-${raw}.json`;
  }

  throw new Error(
    "Invalid TOP_RATED_FILE. Use a number (e.g. 3) or file name (e.g. top-rated-3.json).",
  );
}

async function getTopRatedFiles(fileSelector) {
  const entries = await readdir(DATA_DIR, { withFileTypes: true });
  const availableTopRatedFiles = entries
    .filter(
      (entry) => entry.isFile() && /^top-rated-\d+\.json$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => extractTopRatedIndex(a) - extractTopRatedIndex(b));

  const selectedFile = normalizeTopRatedFileName(fileSelector);
  const topRatedFiles = selectedFile
    ? availableTopRatedFiles.filter((fileName) => fileName === selectedFile)
    : availableTopRatedFiles;

  if (topRatedFiles.length === 0) {
    if (selectedFile) {
      throw new Error(
        `File ${selectedFile} not found in ${DATA_DIR}. Available files: ${availableTopRatedFiles.join(", ")}`,
      );
    }

    throw new Error(`No top-rated files found in ${DATA_DIR}.`);
  }

  return topRatedFiles;
}

async function readGamesFromTopRatedFile(fileName) {
  const filePath = resolve(DATA_DIR, fileName);
  const raw = await readFile(filePath, "utf8");
  const payload = JSON.parse(raw);

  if (!Array.isArray(payload?.games)) {
    throw new Error(`Invalid games payload in ${fileName}. Expected games[]`);
  }

  return payload.games;
}

async function readResumeForGame(gameId) {
  const resumePath = resolve(RESULTS_DIR, `${gameId}.txt`);

  try {
    const text = await readFile(resumePath, "utf8");
    return text.trim();
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = String(error.code);
      if (code === "ENOENT") {
        throw new Error(
          `Missing resume file for game ${gameId}: ${resumePath}`,
        );
      }
    }

    throw error;
  }
}

async function writeBatch(batchGames, batchNumber, totalGamesProcessed) {
  const outputPath = resolve(
    OUTPUT_DIR,
    `top-rated-resume-batch-pt-${batchNumber}.json`,
  );
  const startIndex = totalGamesProcessed - batchGames.length + 1;

  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        batchNumber,
        batchSize: batchGames.length,
        globalStartIndex: startIndex,
        globalEndIndex: totalGamesProcessed,
        games: batchGames,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `Saved batch ${batchNumber} (${batchGames.length} games) to ${outputPath}`,
  );
}

async function run() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: resolve(process.cwd(), ".env") });

  const topRatedFileSelector = process.env.TOP_RATED_FILE;
  const topRatedFiles = await getTopRatedFiles(topRatedFileSelector);

  if (topRatedFileSelector) {
    console.log(`Using top-rated file selector: ${topRatedFileSelector}`);
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  let totalGamesProcessed = 0;
  let batchNumber = 0;
  let currentBatch = [];

  for (const fileName of topRatedFiles) {
    console.log(`Processing ${fileName}...`);
    const games = await readGamesFromTopRatedFile(fileName);

    for (const game of games) {
      const gameId = Number(game?.id);

      if (!Number.isInteger(gameId) || gameId <= 0) {
        throw new Error(`Invalid game id in ${fileName}: ${String(game?.id)}`);
      }

      const resume = await readResumeForGame(gameId);
      currentBatch.push({
        ...game,
        resume,
      });
      totalGamesProcessed += 1;

      if (currentBatch.length === BATCH_SIZE) {
        batchNumber += 1;
        await writeBatch(currentBatch, batchNumber, totalGamesProcessed);
        currentBatch = [];
      }
    }
  }

  if (currentBatch.length > 0) {
    batchNumber += 1;
    await writeBatch(currentBatch, batchNumber, totalGamesProcessed);
  }

  console.log(
    `Done. Processed ${totalGamesProcessed} games into ${batchNumber} batch file(s).`,
  );
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Batch build failed: ${message}`);
  process.exitCode = 1;
});
