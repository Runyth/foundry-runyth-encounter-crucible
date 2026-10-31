// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { createApi } from "../module/encounter-crucible/scripts/api.js";
import { createEncounterDefinition } from "../module/encounter-crucible/scripts/core/encounter.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;

test.beforeEach(() => {
  const root = { id: "root", type: "Actor", name: "Root", folder: null };
  const child = { id: "child", type: "Actor", name: "Child", folder: root };
  const npc1 = { id: "npc1", uuid: "Actor.npc1", name: "Guard", type: "npc", folder: root, system: { details: { cr: 1 }, attributes: { hp: { value: 10, max: 10 }, ac: { value: 12 } } }, items: [] };
  const npc2 = { id: "npc2", uuid: "Actor.npc2", name: "Captain", type: "npc", folder: child, system: { details: { cr: 2 }, attributes: { hp: { value: 20, max: 20 }, ac: { value: 14 } } }, items: [] };
  const pc = { id: "pc", uuid: "Actor.pc", name: "Hero", type: "character", folder: null, system: { details: { level: 3 }, attributes: { hp: { value: 20, max: 20 }, ac: { value: 15 } } }, items: [] };
  globalThis.game = {
    user: { isGM: true },
    system: { id: "dnd5e", version: "5.3.3" },
    settings: { get(_module, key) { return key === "includeCurrentResources" ? true : undefined; } },
    folders: { contents: [root, child], get(id) { return [root, child].find((entry) => entry.id === id); } },
    actors: { contents: [npc1, npc2, pc] }
  };
  globalThis.Hooks = { callAll() {} };
});

test.after(() => {
  globalThis.game = originalGame;
  globalThis.Hooks = originalHooks;
});

function api() {
  return createApi({ openDashboard() {}, openWorkshop() {}, rememberEncounter() { throw new Error("must not persist"); } });
}

test("a campaign helper required capabilities are discoverable through every public surface", () => {
  const core = api();
  for (const name of ["collectActors", "assessEncounter"]) {
    assert.equal(core.hasCapability(name), true);
    assert.equal(core.capabilityMap[name], true);
    assert.equal(core.capabilities.includes(name), true);
    assert.equal(core.capabilities[name], core[name]);
    assert.equal(core.features[name], core[name]);
    assert.equal(core.helperApi[name], core[name]);
    assert.equal(core.getCapability(name), core[name]);
    assert.equal(core.getCapabilityVersion(name), "1.0.0");
    assert.equal(core.getCapabilityDescriptor(name).api, core[name]);
    assert.equal(core[name].supports("^1.0.0"), true);
    assert.equal(core[name].assertVersion(">=1.0.0 <2.0.0"), true);
  }
});

test("collectActors returns raw world Actors by default and supports recursive folders", () => {
  const core = api();
  assert.deepEqual(core.collectActors().map((actor) => actor.id), ["npc1", "npc2", "pc"]);
  assert.deepEqual(core.collectActors("root", true).map((actor) => actor.id), ["npc1", "npc2"]);
  assert.deepEqual(core.collectActors({ folderId: "root", recursive: false }).map((actor) => actor.id), ["npc1"]);
  assert.deepEqual(core.collectActors({ types: "npc" }).map((actor) => actor.id), ["npc1", "npc2"]);
});

test("collectActors optionally delegates normalization to Encounter Crucible", () => {
  const core = api();
  const normalized = core.collectActors({ folderId: "root", recursive: true, normalized: true, side: "enemy" });
  assert.deepEqual(normalized.map((actor) => actor.actorUuid), ["Actor.npc1", "Actor.npc2"]);
  assert.deepEqual(normalized.map((actor) => actor.cr), [1, 2]);
  assert.ok(normalized.every((actor) => actor.side === "enemy"));
});

test("collectActors remains GM-only", () => {
  globalThis.game.user = { isGM: false };
  const core = api();
  assert.throws(() => core.collectActors(), /Only a GM/);
});

test("assessEncounter uses authoritative analysis without persisting or emitting hooks by default", async () => {
  let afterHooks = 0;
  globalThis.Hooks = { callAll(name) { if (name === "encounterCrucibleAfterAnalyse") afterHooks += 1; } };
  const core = api();
  const encounter = createEncounterDefinition({
    party: [{ id: "pc", name: "Hero", side: "party", level: 3, quantity: 1, contribution: 1, hp: { value: 20, max: 20 }, actions: 1 }],
    enemies: [{ id: "enemy", name: "Guard", side: "enemy", cr: 1, xp: 200, quantity: 1, contribution: 1, hp: { value: 10, max: 10 }, actions: 1 }]
  });
  const assessment = await core.assessEncounter(encounter);
  assert.equal(assessment, encounter.assessment);
  assert.ok(assessment.models.rules2024);
  assert.equal(afterHooks, 0);
});
