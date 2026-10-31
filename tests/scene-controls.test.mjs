// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { registerSceneControlsIntegration, upsertSceneControlTool } from "../module/encounter-crucible/scripts/integrations/scene-controls.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;

test.after(() => {
  globalThis.game = originalGame;
  globalThis.Hooks = originalHooks;
});

test("Scene Controls use the Foundry V13 record shape and remain idempotent", () => {
  globalThis.game = { user: { isGM: true } };
  let opens = 0;
  const controls = {
    tokens: {
      tools: {
        select: { name: "select", order: 2 }
      }
    }
  };

  assert.equal(upsertSceneControlTool(controls, () => { opens += 1; }), true);
  assert.equal(upsertSceneControlTool(controls, () => { opens += 1; }), false);
  assert.deepEqual(Object.keys(controls.tokens.tools).sort(), ["encounter-crucible", "select"]);
  assert.equal(controls.tokens.tools["encounter-crucible"].order, 3);
  assert.equal(controls.tokens.tools["encounter-crucible"].visible, true);
  controls.tokens.tools["encounter-crucible"].onChange();
  assert.equal(opens, 1);
});

test("unsupported Scene Controls shapes fail without mutation", () => {
  globalThis.game = { user: { isGM: true } };
  const controls = { tokens: { tools: [] } };
  assert.equal(upsertSceneControlTool(controls, () => {}), false);
  assert.deepEqual(controls.tokens.tools, []);
});

test("Scene Controls hook registration occurs once", () => {
  globalThis.game = { user: { isGM: true } };
  let registrations = 0;
  globalThis.Hooks = {
    on(name, callback) {
      registrations += 1;
      assert.equal(name, "getSceneControlButtons");
      assert.equal(typeof callback, "function");
      return 41;
    }
  };

  assert.equal(registerSceneControlsIntegration(() => {}), 41);
  assert.equal(registerSceneControlsIntegration(() => {}), 41);
  assert.equal(registrations, 1);
});
