// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  activeCombatReferencesActor,
  encounterReferencesActor,
  registerRuntimeRefreshHooks
} from "../module/runyth-encounter-crucible/scripts/integrations/runtime-refresh.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;
const originalUi = globalThis.ui;

test.after(() => {
  globalThis.game = originalGame;
  globalThis.Hooks = originalHooks;
  globalThis.ui = originalUi;
});

test("Actor relevance checks are narrow and positive", () => {
  const actor = { id: "a1", uuid: "Actor.a1" };
  const other = { id: "a2", uuid: "Actor.a2" };
  const encounter = { party: [{ actorUuid: "Actor.a1" }], enemies: [], allies: [], neutral: [] };
  const combat = { combatants: { contents: [{ actor }] } };

  assert.equal(encounterReferencesActor(encounter, actor), true);
  assert.equal(encounterReferencesActor(encounter, other), false);
  assert.equal(activeCombatReferencesActor(actor, combat), true);
  assert.equal(activeCombatReferencesActor(other, combat), false);
});

test("runtime refresh hooks register once and ignore unrelated Actor updates", async () => {
  const callbacks = new Map();
  let hookRegistrations = 0;
  let combatRenders = 0;
  let windowInvalidations = 0;
  globalThis.Hooks = {
    on(name, callback) {
      hookRegistrations += 1;
      callbacks.set(name, callback);
      return hookRegistrations;
    }
  };
  globalThis.game = { combat: null };
  globalThis.ui = { combat: { render: () => { combatRenders += 1; } } };
  const encounter = { party: [{ actorUuid: "Actor.relevant" }], enemies: [], allies: [], neutral: [] };
  const options = {
    invalidateOpenWindows: () => { windowInvalidations += 1; },
    getOpenEncounters: () => [encounter]
  };

  assert.equal(registerRuntimeRefreshHooks(options), true);
  assert.equal(registerRuntimeRefreshHooks(options), false);
  assert.equal(hookRegistrations, 11);

  callbacks.get("updateActor")({ id: "other", uuid: "Actor.other" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(combatRenders, 0);
  assert.equal(windowInvalidations, 0);

  callbacks.get("updateActor")({ id: "relevant", uuid: "Actor.relevant" });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(combatRenders, 1);
  assert.equal(windowInvalidations, 1);
});
