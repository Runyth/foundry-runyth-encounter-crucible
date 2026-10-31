// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const moduleRoot = path.join(root, "module", "encounter-crucible");

async function filesBelow(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await filesBelow(file));
    else results.push(file);
  }
  return results;
}

test("manifest and repository metadata use the same version", async () => {
  const manifest = JSON.parse(await readFile(path.join(moduleRoot, "module.json"), "utf8"));
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(manifest.id, "encounter-crucible");
  assert.equal(manifest.version, packageJson.version);
  assert.equal(manifest.compatibility.minimum, "13");
  assert.equal(manifest.compatibility.verified, "13.351");
  assert.deepEqual(manifest.esmodules, ["scripts/main.js"]);
  assert.equal(manifest.socket, false);
});

test("English and German localization keys are identical", async () => {
  const en = JSON.parse(await readFile(path.join(moduleRoot, "lang", "en.json"), "utf8"));
  const de = JSON.parse(await readFile(path.join(moduleRoot, "lang", "de.json"), "utf8"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  assert.ok(Object.keys(en).length >= 100);
});

test("runtime source contains no known deprecated Foundry V1 application APIs", async () => {
  const files = (await filesBelow(moduleRoot)).filter((file) => /\.(?:js|hbs)$/.test(file));
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  const forbidden = [
    /\bFormApplication\b/,
    /\bFormDataExtended\b/,
    /Hooks\.on\(["']renderChatMessage["']/,
    /\.find\(["'][.#\[]/,
    /\bloadTemplates\s*\(/,
    /\bFilePicker\s*\./
  ];
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern);
  assert.match(source, /ApplicationV2/);
  assert.match(source, /HandlebarsApplicationMixin/);
});

test("the source tree documents the extension contract and deterministic release workflow", async () => {
  const api = await readFile(path.join(root, "docs", "API.md"), "utf8");
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const packageTool = await readFile(path.join(root, "tools", "package.py"), "utf8");
  for (const required of ["registerModel", "registerSystemAdapter", "registerResourceProvider", "whenReady", "isApiVersionSupported", "encounterCrucibleApiReady", "registerHelperModule", "listHelperModules"]) {
    assert.match(api, new RegExp(required));
  }
  for (const command of ["npm ci", "npm test", "npm run build", "npm run package"]) {
    assert.match(readme, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(packageTool, /FIXED_TIME/);
  assert.match(packageTool, /validate_zip/);
});


test("release tooling creates separate installable, source, and documentation ZIPs", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(root, "module", "encounter-crucible", "module.json"), "utf8"));
  const packageTool = await readFile(path.join(root, "tools", "package.py"), "utf8");
  for (const archive of [
    `encounter-crucible-v${manifest.version}-mod.zip`,
    `encounter-crucible-v${manifest.version}-src.zip`,
    `encounter-crucible-v${manifest.version}-doc.zip`
  ]) {
    assert.match(readme, new RegExp(archive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(packageTool, /DOCUMENTATION_NAME/);
  assert.match(packageTool, /kind == "documentation"/);
  assert.match(packageTool, /AUTOMATED-VALIDATION\.md/);
  assert.match(packageTool, /RELEASE-MANIFEST\.json/);
});
