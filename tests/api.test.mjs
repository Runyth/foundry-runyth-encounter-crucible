// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { createApi } from "../module/runyth-encounter-crucible/scripts/api.js";
import { createEncounterDefinition } from "../module/runyth-encounter-crucible/scripts/core/encounter.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;

test.beforeEach(() => {
  globalThis.game = {
    settings: {
      get(_module, key) {
        if (key === "includeCurrentResources") return false;
        return undefined;
      }
    }
  };
  globalThis.Hooks = { callAll() {} };
});

test.after(() => {
  globalThis.game = originalGame;
  globalThis.Hooks = originalHooks;
});

test("analysis can ignore current resources without mutating the encounter", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const encounter = createEncounterDefinition({
    party: [{
      id: "pc",
      name: "PC",
      side: "party",
      level: 5,
      xp: 0,
      quantity: 1,
      contribution: 1,
      hp: { value: 1, max: 40 },
      spellRatio: 0,
      resourceRatio: 0,
      actions: 1
    }],
    enemies: [{
      id: "enemy",
      name: "Enemy",
      side: "enemy",
      cr: 1,
      xp: 200,
      quantity: 1,
      contribution: 1,
      hp: { value: 20, max: 20 },
      actions: 1
    }]
  });
  const assessment = await api.analyseDefinition(encounter);
  assert.equal(assessment.models.resources.metrics.effectivePartyStrength, 1);
  assert.equal(encounter.party[0].hp.value, 1);
  assert.equal(encounter.party[0].spellRatio, 0);
});

test("registered extension models run and failures remain isolated", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  api.registerModel({
    id: "example",
    supports: () => true,
    calculate: async () => ({ id: "example", classification: "challenging", confidence: 1, metrics: {}, warnings: [] })
  });
  api.registerModel({
    id: "broken",
    calculate: async () => {
      throw new Error("expected test failure");
    }
  });
  api.registerModel({
    id: "broken-support",
    supports: async () => {
      throw new Error("expected support failure");
    },
    calculate: async () => ({})
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const encounter = createEncounterDefinition({
      party: [{ id: "pc", name: "PC", side: "party", level: 1, xp: 0, quantity: 1, contribution: 1, hp: { value: 10, max: 10 }, actions: 1 }],
      enemies: [{ id: "enemy", name: "Enemy", side: "enemy", cr: 0.25, xp: 50, quantity: 1, contribution: 1, hp: { value: 7, max: 7 }, actions: 1 }]
    });
    const assessment = await api.analyseDefinition(encounter);
    assert.equal(assessment.models.example.classification, "challenging");
    assert.ok(assessment.warnings.includes("extension-model-failed:broken"));
    assert.ok(assessment.warnings.includes("extension-model-failed:broken-support"));
  } finally {
    console.error = originalError;
  }
});

test("extension models cannot replace built-in model identifiers", () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  assert.throws(() => api.registerModel({ id: "rules2024", calculate() {} }), /conflicts with a built-in model/);
});

test("analysed encounters remain JSON serializable across repeated analysis", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const encounter = createEncounterDefinition({
    party: [{ id: "pc", name: "PC", side: "party", level: 3, quantity: 1, contribution: 1, hp: { value: 20, max: 20 }, actions: 1 }],
    enemies: [{ id: "enemy", name: "Enemy", side: "enemy", cr: 1, xp: 200, quantity: 1, contribution: 1, hp: { value: 10, max: 10 }, actions: 1 }]
  });
  await api.analyseDefinition(encounter, { remember: false });
  await api.analyseDefinition(encounter, { remember: false });
  const serialized = JSON.stringify(encounter);
  assert.match(serialized, /"assessment"/);
  assert.equal(encounter.assessment.context.assessment, undefined);
});

test("active Combat analysis is GM-only", async () => {
  globalThis.game.user = { isGM: false };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  await assert.rejects(() => api.analyseCombat({ id: "combat-1" }), /Only a GM/);
});

test("the documented before-analysis hook can veto exactly before calculation", async () => {
  globalThis.game.user = { isGM: true };
  let beforeCalls = 0;
  globalThis.Hooks = {
    call(name) {
      assert.equal(name, "encounterCrucibleBeforeAnalyse");
      beforeCalls += 1;
      return false;
    },
    callAll() {}
  };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  await assert.rejects(() => api.analyseCombat({ id: "combat-1" }), /cancelled/);
  assert.equal(beforeCalls, 1);
});

test("after-analysis hooks fire once and passive previews can suppress them", async () => {
  globalThis.game.user = { isGM: true };
  let afterCalls = 0;
  globalThis.Hooks = {
    callAll(name) {
      if (name === "encounterCrucibleAfterAnalyse") afterCalls += 1;
    }
  };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const encounter = createEncounterDefinition({
    party: [{ id: "pc", name: "PC", side: "party", level: 1, quantity: 1, contribution: 1, hp: { value: 10, max: 10 }, actions: 1 }],
    enemies: [{ id: "enemy", name: "Enemy", side: "enemy", cr: 0.25, xp: 50, quantity: 1, contribution: 1, hp: { value: 7, max: 7 }, actions: 1 }]
  });
  await api.analyseDefinition(encounter);
  await api.analyseDefinition(encounter, { emitHooks: false, remember: false });
  assert.equal(afterCalls, 1);
});

test("Helper API compatibility metadata is exposed through stable aliases", async () => {
  const lifecycle = {
    isReady: false,
    whenReady: () => Promise.resolve()
  };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {}, lifecycle });
  assert.equal(api.version, "2.7.5");
  assert.equal(api.apiVersion, "2.7.5");
  assert.equal(api.helperApiVersion, "2.7.5");
  assert.equal(api.helperAPIVersion, "2.7.5");
  assert.equal(api.helperVersion, "2.7.5");
  assert.equal(api.API_VERSION, "2.7.5");
  assert.equal(api.HELPER_API_VERSION, "2.7.5");
  assert.equal(api.moduleVersion, "1.9.2");
  assert.equal(api.coreVersion, "1.9.2");
  assert.equal(api.MODULE_VERSION, "1.9.2");
  assert.equal(api.helperApi.version, "2.7.5");
  assert.equal(api.helperAPI, api.helperApi);
  assert.equal(api.compatibility.helperApiVersion, "2.7.5");
  assert.equal(api.isApiVersionSupported(">=2.7.1"), true);
  assert.equal(api.isModuleVersionSupported(">=1.8.1"), true);
  assert.equal(api.assertApiVersion("2.7.5"), true);
  assert.equal(api.assertModuleVersion(">=1.8.1"), true);
  assert.equal(await api.whenReady(), api);
});


test("encounterGeneration capability is explicit, discoverable, frozen, and backward compatible", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  assert.equal(api.hasCapability("encounterGeneration"), true);
  assert.equal(api.hasCapability("missingCapability"), false);
  assert.equal(api.assertCapability("encounterGeneration"), true);
  assert.throws(() => api.assertCapability("missingCapability"), /does not provide/);
  assert.deepEqual(api.capabilities, ["encounterGeneration", "collectActors", "assessEncounter", "helperModuleRegistry"]);
  assert.deepEqual(api.supportedCapabilities, ["encounterGeneration", "collectActors", "assessEncounter", "helperModuleRegistry"]);
  assert.equal(api.capabilityMap.encounterGeneration, true);
  assert.equal(api.capabilities.encounterGeneration, api.encounterGeneration);
  assert.equal(api.helperApi.capabilities.encounterGeneration, api.encounterGeneration);
  assert.equal(api.capabilityVersions.encounterGeneration, "1.0.1");
  assert.equal(api.helperApi.capabilityVersions.encounterGeneration, "1.0.1");
  assert.equal(api.compatibility.capabilityVersions.encounterGeneration, "1.0.1");
  assert.equal(api.getCapabilityVersion("encounterGeneration"), "1.0.1");
  assert.equal(api.getCapabilityVersion("missingCapability"), null);
  assert.equal(api.getCapabilityDescriptor("encounterGeneration").api, api.encounterGeneration);
  assert.equal(api.hasCapability("encounterGeneration", ">=1.0.0 <2.0.0"), true);
  assert.equal(api.hasCapability("encounterGeneration", ">=2.0.0"), false);
  assert.equal(api.assertCapability("encounterGeneration", "^1.0.0"), true);
  assert.throws(() => api.assertCapability("encounterGeneration", ">=2.0.0"), /does not satisfy/);
  assert.equal(api.getCapability("encounterGeneration"), api.encounterGeneration);
  assert.equal(api.getCapability("missingCapability"), null);
  assert.equal(api.features.encounterGeneration, api.encounterGeneration);
  assert.equal(api.helperApi.encounterGeneration, api.encounterGeneration);
  assert.deepEqual(api.compatibility.capabilities, ["encounterGeneration", "collectActors", "assessEncounter", "helperModuleRegistry"]);
  assert.equal(typeof api.encounterGeneration, "function");
  assert.equal(api.encounterGeneration.id, "encounterGeneration");
  assert.equal(api.encounterGeneration.capability, "encounterGeneration");
  assert.equal(api.encounterGeneration.available, true);
  assert.equal(api.encounterGeneration.version, "1.0.1");
  assert.equal(api.encounterGeneration.supports(">=1.0.0"), true);
  assert.equal(api.encounterGeneration.supports(">=2.0.0"), false);
  assert.equal(api.encounterGeneration.assertVersion("~1.0.0"), true);
  assert.equal(api.encounterGeneration.generate, api.generateEncounterAsync);
  assert.equal(api.encounterGeneration.generateAsync, api.generateEncounterAsync);
  assert.equal(api.encounterGeneration.generateSync, api.generateEncounter);
  assert.equal(api.encounterGeneration.generateEncounter, api.generateEncounter);
  assert.equal(api.encounterGeneration.generateEncounterAsync, api.generateEncounterAsync);
  assert.equal(api.encounterGeneration.createEncounterDefinition, api.createEncounterDefinition);
  assert.equal(api.encounterGeneration.resolveCompositionMode, api.resolveCompositionMode);
  assert.equal(api.encounterGeneration.targetBudgetForDifficulty, api.targetBudgetForDifficulty);
  assert.equal(Object.isFrozen(api.encounterGeneration), true);
  assert.equal(Object.isFrozen(api.capabilities), true);
});



test("encounterGeneration capability preserves GM permissions for world browsing", async () => {
  globalThis.game.user = { isGM: false };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  assert.throws(() => api.encounterGeneration.actorCandidates(), /Only a GM/);
  assert.throws(() => api.encounterGeneration.listSavedEncounters(), /Only a GM/);
});

test("encounterGeneration namespace generates through synchronous and browser-safe entry points", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const input = {
    party: [{ id: "pc", name: "PC", side: "party", level: 3, quantity: 1, contribution: 1 }],
    candidates: [
      { id: "goblin", name: "Goblin", cr: 0.25, xp: 50 },
      { id: "guard", name: "Guard", cr: 0.125, xp: 25 }
    ],
    target: "low",
    minimumCount: 1,
    maximumCount: 3,
    allowDuplicates: true
  };
  const synchronous = api.encounterGeneration.generateSync(input);
  const asynchronous = await api.encounterGeneration.generate(input, { preferWorker: false });
  const callable = await api.encounterGeneration(input, { preferWorker: false });
  assert.equal(synchronous.generation.targetXp, asynchronous.generation.targetXp);
  assert.equal(synchronous.generation.actualXp, asynchronous.generation.actualXp);
  assert.equal(asynchronous.generation.actualXp, callable.generation.actualXp);
  assert.deepEqual(
    synchronous.enemies.map(({ id, quantity }) => ({ id, quantity })),
    asynchronous.enemies.map(({ id, quantity }) => ({ id, quantity }))
  );
});

test("independent extension models calculate concurrently and retain registration order", async () => {
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const started = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  for (const id of ["first", "second"]) {
    api.registerModel({
      id,
      async calculate() {
        started.push(id);
        await gate;
        return { id, classification: "challenging", confidence: 1, metrics: {}, warnings: [] };
      }
    });
  }
  const encounter = createEncounterDefinition({
    party: [{ id: "pc", name: "PC", side: "party", level: 1, quantity: 1, contribution: 1, hp: { value: 10, max: 10 }, actions: 1 }],
    enemies: [{ id: "enemy", name: "Enemy", side: "enemy", cr: 0.25, xp: 50, quantity: 1, contribution: 1, hp: { value: 7, max: 7 }, actions: 1 }]
  });
  const analysis = api.analyseDefinition(encounter, { remember: false });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, ["first", "second"]);
  release();
  const assessment = await analysis;
  assert.deepEqual(Object.keys(assessment.models).slice(-2), ["first", "second"]);
});

test("helper-module registration is exposed through all Forge-compatible API surfaces", () => {
  const events = [];
  globalThis.Hooks = {
    callAll(name, descriptor, previous) {
      events.push({ name, descriptor, previous });
    }
  };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  const forgeApi = { version: "1.0.1", capabilities: ["encounterGeneration"] };
  const registration = api.registerHelperModule({
    id: "runyth-encounter-crucible-forge",
    api: forgeApi
  });

  assert.equal(api.helperModules, api.helperRegistry);
  assert.equal(api.helperModules, api.helpers);
  assert.equal(api.helperApi.helperModuleRegistry, api.helperModules);
  assert.equal(api.helperApi.helperModules, api.helperModules);
  assert.equal(api.helperApi.helpers, api.helperModules);
  assert.equal(api.helperApi.registerHelperModule, api.registerHelperModule);
  assert.equal(api.helperApi.registerHelper, api.registerHelper);
  assert.equal(api.hasCapability("helperModuleRegistry"), true);
  assert.equal(api.getCapability("helperModuleRegistry"), api.helperModules);
  assert.equal(api.capabilityMap.helperModuleRegistry, true);
  assert.equal(api.hasHelperModule("runyth-encounter-crucible-forge"), true);
  assert.equal(api.hasHelper("runyth-encounter-crucible-forge"), true);
  assert.equal(api.getHelperModule("runyth-encounter-crucible-forge"), registration);
  assert.equal(api.getHelper("runyth-encounter-crucible-forge"), registration);
  assert.deepEqual(api.listHelperModules(), [registration]);
  assert.deepEqual(api.listHelpers(), [registration]);
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "encounterCrucibleHelperRegistered");
});

test("helper-module unregister aliases remove one registration and emit once", () => {
  const events = [];
  globalThis.Hooks = { callAll: (...args) => events.push(args) };
  const api = createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() {} });
  api.registerHelper("forge", { version: "1.0.1" });
  assert.equal(api.unregisterHelperModule("forge"), true);
  assert.equal(api.unregisterHelper("forge"), false);
  assert.equal(events.filter(([name]) => name === "encounterCrucibleHelperUnregistered").length, 1);
});
