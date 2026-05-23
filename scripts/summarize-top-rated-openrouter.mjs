#!/usr/bin/env node

import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dotenv from "dotenv";

//const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_CHAT_URL = "http://localhost:11434/v1/chat/completions";
const DATA_DIR = resolve(process.cwd(), "src/data/json");
const RESULTS_DIR = resolve(DATA_DIR, "results");
const REQUEST_DELAY_MS = 250;
const RETRY_DELAY_MS = 5_000;
const MAX_RETRIES = 3;

// Keep this prompt simple here and refine it as needed.
const SUMMARY_PROMPT_TEMPLATE = [
  "You are a concise game copywriter.",
  "Rewrite the game summary in plain text with 1 to 3 short sentences.",
  "Keep only important information and avoid hype words.",
  "Limit to up to 30 words.",
  "Use only the information provided in the original summary. Do not add any new information.",
  "Output only the rewritten text.",
  "",
  "Game: {{name}}",
  "Original summary:",
  "{{summary}}",
].join("\n");

function sleep(ms) {
  return new Promise((resolveSleep) => {
    console.log("Waiting for", ms / 1000, "s before the next request...");
    setTimeout(resolveSleep, ms);
  });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0s";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function buildPrompt(gameName, originalSummary) {
  return SUMMARY_PROMPT_TEMPLATE.replace("{{name}}", gameName).replace(
    "{{summary}}",
    originalSummary,
  );
}

function parseModelResponse(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String(part.text ?? "");
        }

        return "";
      })
      .join("\n")
      .trim();

    return joined;
  }

  return "";
}

async function callOpenRouter(prompt, model, apiKey) {
  console.log("Calling OpenRouter API...");

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "Summarizer",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `OpenRouter request failed (${response.status} ${response.statusText}): ${body}`,
    );
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const text = parseModelResponse(content);

  if (!text) {
    throw new Error("Model returned an empty response.");
  }

  return text;
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

async function loadTopRatedGames(dataDir, fileSelector) {
  const entries = await readdir(dataDir, { withFileTypes: true });
  const availableTopRatedFiles = entries
    .filter(
      (entry) => entry.isFile() && /^top-rated-\d+\.json$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => {
      const aNum = Number(a.match(/top-rated-(\d+)\.json/)?.[1] ?? 0);
      const bNum = Number(b.match(/top-rated-(\d+)\.json/)?.[1] ?? 0);

      return aNum - bNum;
    });

  const selectedFile = normalizeTopRatedFileName(fileSelector);
  const topRatedFiles = selectedFile
    ? availableTopRatedFiles.filter((fileName) => fileName === selectedFile)
    : availableTopRatedFiles;

  if (topRatedFiles.length === 0) {
    if (selectedFile) {
      throw new Error(
        `File ${selectedFile} not found in ${dataDir}. Available files: ${availableTopRatedFiles.join(", ")}`,
      );
    }

    throw new Error(`No top-rated JSON files found in ${dataDir}.`);
  }

  const gamesById = new Map();

  for (const fileName of topRatedFiles) {
    const filePath = resolve(dataDir, fileName);
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const games = Array.isArray(parsed?.games) ? parsed.games : [];

    for (const game of games) {
      const id = Number(game?.id);
      const name = String(game?.name ?? "").trim();
      const summary = String(game?.summary ?? "").trim();

      if (!Number.isFinite(id) || !name || !summary) {
        continue;
      }

      if (!gamesById.has(id)) {
        gamesById.set(id, { id, name, summary });
      }
    }
  }

  return Array.from(gamesById.values());
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function summarizeGame(game, model, apiKey, metrics) {
  const prompt = buildPrompt(game.name, game.summary);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      metrics.totalApiRequests += 1;
      return await callOpenRouter(prompt, model, apiKey);
    } catch (error) {
      if (error && typeof error === "object" && error.status === 403) {
        throw error;
      }

      if (attempt === MAX_RETRIES) {
        throw error;
      }

      metrics.totalRetries += 1;

      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[${game.id}] attempt ${attempt}/${MAX_RETRIES} failed: ${message}`,
      );
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error("Unexpected retry flow reached.");
}

async function run() {
  dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  dotenv.config({ path: resolve(process.cwd(), ".env") });

  const apiKey = "ollama"; //process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
  const topRatedFileSelector = process.env.TOP_RATED_FILE;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  }

  const games = await loadTopRatedGames(DATA_DIR, topRatedFileSelector);
  await mkdir(RESULTS_DIR, { recursive: true });

  if (topRatedFileSelector) {
    console.log(`Using top-rated file selector: ${topRatedFileSelector}`);
  }

  console.log(`Loaded ${games.length} games from top-rated JSON files.`);
  console.log(`Using model: ${model}`);

  const metrics = {
    totalApiRequests: 0,
    totalRetries: 0,
  };

  const runStartTime = Date.now();
  let processedCount = 0;
  let skippedStreak = [];

  const gameStates = await Promise.all(
    games.map(async (game) => ({
      game,
      alreadyProcessed: await fileExists(
        resolve(RESULTS_DIR, `${game.id}.txt`),
      ),
    })),
  );
  const pendingCount = gameStates.reduce(
    (count, state) => count + (state.alreadyProcessed ? 0 : 1),
    0,
  );

  function flushSkippedStreak() {
    if (skippedStreak.length === 0) return;
    if (skippedStreak.length === 1) {
      console.log(`[skip] Game ${skippedStreak[0]} already processed.`);
    } else {
      console.log(
        `[skip] Games ${skippedStreak.join(", ")} already processed (${skippedStreak.length} entries).`,
      );
    }
    skippedStreak = [];
  }

  for (let index = 0; index < gameStates.length; index += 1) {
    const { game, alreadyProcessed } = gameStates[index];
    const position = index + 1;
    const outputPath = resolve(RESULTS_DIR, `${game.id}.txt`);

    if (alreadyProcessed) {
      skippedStreak.push(game.id);
      continue;
    }

    flushSkippedStreak();
    console.log(`[${position}/${games.length}] Summarizing game ${game.id}...`);

    const summarizedText = await summarizeGame(game, model, apiKey, metrics);

    await writeFile(outputPath, `${summarizedText}\n`, "utf8");
    processedCount += 1;

    const elapsedMs = Date.now() - runStartTime;
    const averageTimePerSavedFileMs = elapsedMs / processedCount;
    const remainingFiles = pendingCount - processedCount;
    const estimatedTimeRemainingMs = averageTimePerSavedFileMs * remainingFiles;

    console.log(
      `[${position}/${games.length}] Saved ${outputPath} | avg/request: ${formatDuration(averageTimePerSavedFileMs)} | ETA: ${formatDuration(estimatedTimeRemainingMs)} (${remainingFiles} file(s) remaining)`,
    );

    if (position < games.length) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  flushSkippedStreak();

  const skippedCount = games.length - processedCount;
  console.log(
    `✅ Done. Wrote ${processedCount} new summary file(s) in ${RESULTS_DIR}.`,
  );
  console.log(`Skipped: ${skippedCount} already processed.`);
  console.log(`Total API requests: ${metrics.totalApiRequests}`);
  console.log(`Total retries: ${metrics.totalRetries}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Summarization failed: ${message}`);
  process.exitCode = 1;
});
