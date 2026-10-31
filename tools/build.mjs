// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { bundleEntry } from "./bundle.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const source = path.join(root, "module", "encounter-crucible");
const sourceScripts = path.join(source, "scripts");
const buildRoot = path.join(root, "build");
const target = path.join(buildRoot, "encounter-crucible");
const targetScripts = path.join(target, "scripts");

await rm(buildRoot, { recursive: true, force: true });
await mkdir(buildRoot, { recursive: true });
await cp(source, target, { recursive: true, force: true });

// The editable repository stays modular. The installable runtime is deliberately
// bundled to prevent a failed child ES-module request from suppressing the core API.
await rm(targetScripts, { recursive: true, force: true });
await mkdir(path.join(targetScripts, "workers"), { recursive: true });
const mainBundle = await bundleEntry({
  sourceRoot: sourceScripts,
  entry: "main.js",
  destination: path.join(targetScripts, "main.js"),
  banner: "// Encounter Crucible runtime bundle. Do not edit this generated file."
});
const workerBundle = await bundleEntry({
  sourceRoot: sourceScripts,
  entry: "workers/encounter-generator-worker.js",
  destination: path.join(targetScripts, "workers", "encounter-generator-worker.js"),
  banner: "// Encounter Crucible generation Worker bundle. Do not edit this generated file."
});

const manifest = JSON.parse(await readFile(path.join(target, "module.json"), "utf8"));
if (manifest.id !== path.basename(target)) throw new Error("Build root does not match module id.");
console.log(`built ${target}`);
console.log(`runtime bundle: ${mainBundle.moduleCount} modules, ${mainBundle.bytes} bytes`);
console.log(`worker bundle: ${workerBundle.moduleCount} modules, ${workerBundle.bytes} bytes`);
