// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const moduleRoot = path.join(root, "module", "runyth-encounter-crucible");

async function filesBelow(directory) {
  const results = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await filesBelow(target));
    else results.push(target);
  }
  return results;
}

async function productionSource(extensions) {
  const files = (await filesBelow(moduleRoot)).filter((file) => extensions.includes(path.extname(file)));
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}

test("no broad Application, sheet, Item, Token HUD, or deprecated Chat hook remains", async () => {
  const source = await productionSource([".js", ".hbs"]);
  const forbiddenHooks = [
    "renderApplication",
    "renderApplicationV2",
    "renderActorSheet",
    "renderItemSheet",
    "renderTokenHUD",
    "renderChatMessage"
  ];
  for (const hook of forbiddenHooks) {
    assert.doesNotMatch(source, new RegExp(`Hooks\\.on\\(["']${hook}["']`));
  }
  assert.match(source, /renderCombatTracker/);
  assert.match(source, /getSceneControlButtons/);
});

test("runtime uses native DOM APIs and no jQuery assumptions", async () => {
  const source = await productionSource([".js"]);
  const forbidden = [
    /\bhtml\.find\s*\(/,
    /\bhtml\.on\s*\(/,
    /\bjQuery\s*\(/,
    /(^|[^\w$])\$\s*\(/,
    /\.data\s*\(/,
    /\.attr\s*\(/
  ];
  for (const pattern of forbidden) assert.doesNotMatch(source, pattern);
  assert.match(source, /querySelector/);
  assert.match(source, /addEventListener/);
});

test("Application actions are module-specific and listener lifecycle is owned", async () => {
  const templates = await productionSource([".hbs"]);
  const actions = [...templates.matchAll(/data-action=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.ok(actions.length > 0);
  assert.ok(actions.every((action) => action.startsWith("ec-")));
  const runtime = await productionSource([".js"]);
  assert.match(runtime, /AbortController/);
  assert.match(runtime, /releaseOwnedListeners/);
  assert.doesNotMatch(runtime, /document\.addEventListener\(["']key(?:down|up)/);
});

test("CSS selectors remain module-scoped and do not alter core window chrome", async () => {
  const css = await readFile(path.join(moduleRoot, "styles", "runyth-encounter-crucible.css"), "utf8");
  const globallyForbidden = [
    /^\s*\.window-header\b/m,
    /^\s*\.window-content\b/m,
    /^\s*\.header-control\b/m,
    /^\s*\.window-title\b/m,
    /^\s*\.application\b/m,
    /^\s*\.form-group\b/m,
    /^\s*\.tabs?\b/m,
    /^\s*\.sr-only\b/m,
    /^\s*(?:button|input|select|label)\b/m
  ];
  for (const pattern of globallyForbidden) assert.doesNotMatch(css, pattern);
  for (const line of css.split("\n")) {
    if (line.includes(".ec-")) assert.match(line, /\.runyth-encounter-crucible\s+\.ec-/);
  }
  assert.doesNotMatch(css, /z-index\s*:/);
  assert.doesNotMatch(css, /\.window-header|\.header-control|\.window-title/);
});



test("Workshop filters and narrow-window safeguards remain present", async () => {
  const template = await readFile(path.join(moduleRoot, "templates", "workshop.hbs"), "utf8");
  const workshop = await readFile(path.join(moduleRoot, "scripts", "apps", "workshop.js"), "utf8");
  const css = await readFile(path.join(moduleRoot, "styles", "runyth-encounter-crucible.css"), "utf8");

  assert.match(template, /name="folderSearch"/);
  assert.match(template, /name="candidateSearch"/);
  assert.match(template, /class="ec-table-scroll"/);
  assert.match(workshop, /CANDIDATE_RENDER_LIMIT = 300/);
  assert.match(workshop, /runyth-encounter-crucible-settings-workshop/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /@container runyth-encounter-crucible-window/);
  assert.match(css, /\.ec-table-scroll\s*\{/);
  assert.match(template, /data-ec-generation-progress/);
  assert.match(template, /ec-cancel-generation/);
  assert.match(workshop, /generateEncounterAsync/);
  assert.doesNotMatch(workshop, /this\.api\.generateEncounter\(/);
});

test("encounter generation is isolated from the Foundry main thread", async () => {
  const service = await readFile(path.join(moduleRoot, "scripts", "services", "generation-service.js"), "utf8");
  const worker = await readFile(path.join(moduleRoot, "scripts", "workers", "encounter-generator-worker.js"), "utf8");
  assert.match(service, /new Worker\(/);
  assert.match(service, /generateEncounterCooperatively/);
  assert.match(service, /requestAnimationFrame|scheduler\?\.yield/);
  assert.match(worker, /generateEncounter/);
  assert.match(worker, /type: "progress"/);
});

test("Chat, canvas, keybinding, socket, and document-class invariants are isolated", async () => {
  const source = await productionSource([".js"]);
  assert.equal((source.match(/ChatMessage\.create\s*\(/g) ?? []).length, 1);
  assert.doesNotMatch(source, /\bPIXI\b|\.addChild\s*\(|eventMode\s*=|renderTokenHUD/);
  assert.doesNotMatch(source, /game\.keybindings\.register|document\.addEventListener\(["']key/);
  assert.doesNotMatch(source, /globalThis\.(?:Folder|JournalEntry|Combat|ChatMessage)\b/);
  const manifest = JSON.parse(await readFile(path.join(moduleRoot, "module.json"), "utf8"));
  assert.equal(manifest.socket, false);
});

test("public API version and persistent schema remain patch-compatible", async () => {
  const constants = await readFile(path.join(moduleRoot, "scripts", "core", "constants.js"), "utf8");
  assert.match(constants, /API_VERSION = "2\.7\.5"/);
  assert.match(constants, /SCHEMA_VERSION = 4/);
  const flags = await readFile(path.join(root, "docs", "SETTINGS-AND-FLAGS.md"), "utf8");
  assert.match(flags, /schemaVersion = 4/);
  assert.doesNotMatch(flags, /mandatory migration/i);
});


test("public API is exposed before the init callback and remains idempotent", async () => {
  const source = await readFile(path.join(moduleRoot, "scripts", "main.js"), "utf8");
  const earlyExposure = source.indexOf("exposePublicApi();");
  const initHook = source.indexOf('globalThis.Hooks.once("init"');
  assert.ok(earlyExposure >= 0);
  assert.ok(initHook > earlyExposure);
  assert.match(source, /exposeApi\(globalThis\.game, MODULE_ID, api\)/);
  assert.match(source, /const publicApi = exposePublicApi\(\)/);
});

test("Helper API version aliases and compatibility assertions remain additive", async () => {
  const source = await readFile(path.join(moduleRoot, "scripts", "api.js"), "utf8");
  for (const property of ["apiVersion", "helperApiVersion", "helperAPIVersion", "helperVersion", "helperAPI", "HELPER_API_VERSION", "whenReady", "isApiVersionSupported", "assertApiVersion", "encounterGeneration", "capabilities", "hasCapability", "getCapability", "assertCapability", "registerHelperModule", "helperModules", "helperRegistry", "helpers", "collectActors", "assessEncounter"]) {
    assert.match(source, new RegExp(property));
  }
});
