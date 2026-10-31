// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { bundleEntry } from "../tools/bundle.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const sourceScripts = path.join(root, "module", "encounter-crucible", "scripts");

function installFoundryMocks() {
  const previous = new Map();
  for (const key of ["foundry", "game", "Hooks", "ui", "canvas", "CONFIG"]) previous.set(key, globalThis[key]);

  const once = new Map();
  const on = new Map();
  class ApplicationV2 {
    constructor(options = {}) {
      this.options = options;
      this.position = options.position ?? {};
      this.rendered = false;
    }
    render() {
      this.rendered = true;
      return this;
    }
    _onClose() {}
    async _prepareContext() { return {}; }
    async _onRender() {}
  }
  const HandlebarsApplicationMixin = (Base) => class extends Base {};
  const moduleRecord = { id: "encounter-crucible", version: "1.8.8", api: null };
  const settingsValues = new Map([
    ["includeCurrentResources", true],
    ["rememberLastEncounter", false],
    ["lastEncounter", {}],
    ["debugLogging", false],
    ["showCombatTrackerBanner", true]
  ]);

  globalThis.foundry = {
    applications: { api: { ApplicationV2, HandlebarsApplicationMixin } },
    utils: { getRoute: (route) => `/foundry-prefix/${route}` }
  };
  globalThis.game = {
    modules: new Map([["encounter-crucible", moduleRecord]]),
    user: { isGM: true },
    system: { id: "dnd5e" },
    actors: { contents: [] },
    settings: {
      register() {},
      registerMenu() {},
      get(_module, key) { return settingsValues.get(key); },
      async set(_module, key, value) { settingsValues.set(key, value); return value; }
    },
    i18n: { localize: (key) => key }
  };
  globalThis.Hooks = {
    once(name, callback) { once.set(name, callback); return callback; },
    on(name, callback) {
      const entries = on.get(name) ?? [];
      entries.push(callback);
      on.set(name, entries);
      return callback;
    },
    callAll(name, ...args) {
      for (const callback of on.get(name) ?? []) callback(...args);
    }
  };
  globalThis.ui = { notifications: { warn() {}, error() {}, info() {} }, combat: { render() {} } };
  globalThis.canvas = { tokens: { controlled: [] } };
  globalThis.CONFIG = {};

  return {
    moduleRecord,
    once,
    restore() {
      for (const [key, value] of previous) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    }
  };
}

test("installable main bundle is self-contained and exposes Helper API before init", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "encounter-crucible-bundle-"));
  const destination = path.join(temp, "main.mjs");
  const mocks = installFoundryMocks();
  try {
    const result = await bundleEntry({ sourceRoot: sourceScripts, entry: "main.js", destination });
    assert.ok(result.moduleCount >= 20);
    const content = await readFile(destination, "utf8");
    assert.doesNotMatch(content, /\bimport\s+\{/);
    assert.match(content, /Generated deterministically from modular Encounter Crucible source/);

    await import(`${pathToFileURL(destination).href}?test=${Date.now()}`);
    const api = mocks.moduleRecord.api;
    assert.ok(api, "core API must exist immediately after the runtime bundle evaluates");
    assert.equal(api.apiVersion, "2.7.5");
    assert.equal(api.helperApiVersion, "2.7.5");
    assert.equal(typeof api.collectActors, "function");
    assert.equal(typeof api.assessEncounter, "function");
    assert.equal(typeof api.encounterGeneration, "function");
    assert.equal(typeof api.registerHelperModule, "function");

    const forgeApi = Object.freeze({ id: "forge-helper" });
    const orphanApi = Object.freeze({ id: "campaign-helper-helper" });
    assert.equal(api.registerHelperModule("encounter-crucible-forge", "1.0.0", forgeApi).api, forgeApi);
    assert.equal(api.registerHelperModule("encounter-crucible-campaign-helper", "1.0.0", orphanApi).api, orphanApi);
    assert.equal(api.hasHelperModule("encounter-crucible-forge"), true);
    assert.equal(api.hasHelperModule("encounter-crucible-campaign-helper"), true);
  } finally {
    mocks.restore();
    await rm(temp, { recursive: true, force: true });
  }
});

test("generation Worker URL uses Foundry's route-aware v13 utility", async () => {
  const module = await import("../module/encounter-crucible/scripts/services/generation-service.js");
  const previousFoundry = globalThis.foundry;
  try {
    globalThis.foundry = { utils: { getRoute: (route) => `/prefix/${route}` } };
    assert.equal(
      module.generationWorkerUrl(),
      "/prefix/modules/encounter-crucible/scripts/workers/encounter-generator-worker.js"
    );
  } finally {
    globalThis.foundry = previousFoundry;
  }
});
