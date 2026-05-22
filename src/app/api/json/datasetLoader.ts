import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { RawGameObject } from "./types";

export interface GamesDataset {
  games: RawGameObject[];
}

const DATA_DIR_CANDIDATES = [
  path.join(process.cwd(), "src", "data", "json"),
  path.join(process.cwd(), "data", "json"),
];

async function resolveDataDir(): Promise<string> {
  for (const candidate of DATA_DIR_CANDIDATES) {
    try {
      await readdir(candidate);

      return candidate;
    } catch {
      // Keep trying alternative known data locations.
    }
  }

  throw new Error(
    `Unable to locate JSON data directory. Tried: ${DATA_DIR_CANDIDATES.join(", ")}`,
  );
}

export async function loadDatasetsByPattern(
  pattern: RegExp,
): Promise<GamesDataset[]> {
  const dataDir = await resolveDataDir();

  const files = (await readdir(dataDir))
    .map((fileName) => {
      const match = pattern.exec(fileName);

      return match
        ? {
            fileName,
            index: Number.parseInt(match[1], 10),
          }
        : null;
    })
    .filter((entry): entry is { fileName: string; index: number } =>
      Boolean(entry),
    )
    .sort((a, b) => a.index - b.index);

  return Promise.all(
    files.map(async ({ fileName }) => {
      const filePath = path.join(dataDir, fileName);
      const fileContents = await readFile(filePath, "utf-8");

      return JSON.parse(fileContents) as GamesDataset;
    }),
  );
}
