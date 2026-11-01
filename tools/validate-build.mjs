// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const moduleRoot = path.join(root, "build", "runyth-encounter-crucible");
const manifestPath = path.join(moduleRoot, "module.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const failures = [];

for (const reference of [
  ...(manifest.esmodules ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map((entry) => entry.path)
]) {
  try {
    await access(path.join(moduleRoot, reference));
  } catch {
    failures.push(`missing built runtime reference: ${reference}`);
  }
}

const scriptsRoot = path.join(moduleRoot, "scripts");
const scriptFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith(".js")) scriptFiles.push(file);
  }
}
await walk(scriptsRoot);

const relativeScripts = scriptFiles.map((file) => path.relative(moduleRoot, file).split(path.sep).join("/")).sort();
const expectedScripts = [
  "scripts/main.js",
  "scripts/workers/encounter-generator-worker.js"
];
if (JSON.stringify(relativeScripts) !== JSON.stringify(expectedScripts)) {
  failures.push(`built installable must contain only bundled runtime scripts: ${JSON.stringify(relativeScripts)}`);
}

for (const file of scriptFiles) {
  const content = await readFile(file, "utf8");
  if (/\bimport\s+(?:\{|["'])/.test(content)) failures.push(`${path.relative(moduleRoot, file)} contains a runtime static import`);
  if (/\bexport\s+(?:default|\{|class|function|const|let|var)/.test(content)) failures.push(`${path.relative(moduleRoot, file)} contains an unbundled export`);
  if (!content.includes("Generated deterministically from modular Runyth Encounter Crucible source.")) {
    failures.push(`${path.relative(moduleRoot, file)} is not a generated bundle`);
  }
}

const main = await readFile(path.join(scriptsRoot, "main.js"), "utf8");
for (const marker of [
  "createApi",
  "generateEncounterAsync",
  "normalizeActor",
  "collectActors",
  "assessEncounter",
  "registerHelperModule",
  'API_VERSION = "2.7.5"'
]) {
  if (!main.includes(marker)) failures.push(`main runtime bundle missing critical API marker: ${marker}`);
}

const worker = await readFile(path.join(scriptsRoot, "workers", "encounter-generator-worker.js"), "utf8");
if (!worker.includes("generateEncounter")) failures.push("generation Worker bundle is missing encounter generation logic");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`built-runtime validation passed: ${relativeScripts.length} self-contained bundles, no child ES-module fetches`);
}
