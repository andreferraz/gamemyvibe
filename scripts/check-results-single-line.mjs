#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const TARGET_DIR = resolve(process.cwd(), "src/data/json/results");

async function listTxtFilesRecursively(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = resolve(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await listTxtFilesRecursively(absolutePath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".txt")) {
      files.push(absolutePath);
    }
  }

  return files;
}

function getLogicalLineCount(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  const withoutSingleTrailingBreak = normalized.replace(/\n$/, "");

  if (withoutSingleTrailingBreak.length === 0) {
    return 0;
  }

  return withoutSingleTrailingBreak.split("\n").length;
}

async function run() {
  const txtFiles = await listTxtFilesRecursively(TARGET_DIR);
  const incoherentFiles = [];

  for (const filePath of txtFiles) {
    const content = await readFile(filePath, "utf8");
    const lineCount = getLogicalLineCount(content);

    if (lineCount > 1) {
      incoherentFiles.push(relative(process.cwd(), filePath));
    }
  }

  if (incoherentFiles.length === 0) {
    console.log("No incoherent files found.");
    return;
  }

  for (const filePath of incoherentFiles) {
    console.log(filePath);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Single-line check failed: ${message}`);
  process.exitCode = 1;
});
