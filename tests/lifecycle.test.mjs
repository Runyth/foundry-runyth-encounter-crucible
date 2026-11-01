// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { createLifecycleGate, exposeApi } from "../module/runyth-encounter-crucible/scripts/core/lifecycle.js";

test("public API exposure is idempotent and supports both documented game aliases", () => {
  const module = {};
  const game = {
    modules: new Map([["runyth-encounter-crucible", module]])
  };
  const api = Object.freeze({ apiVersion: "2.7.5" });
  assert.equal(exposeApi(game, "runyth-encounter-crucible", api), true);
  assert.equal(exposeApi(game, "runyth-encounter-crucible", api), true);
  assert.equal(module.api, api);
  assert.equal(game.encounterCrucible, api);
  assert.equal(game.encounterCrucibleApi, api);
});

test("the readiness gate resolves once and retains the first ready value", async () => {
  const lifecycle = createLifecycleGate();
  assert.equal(lifecycle.isReady, false);
  const promise = lifecycle.whenReady();
  const first = { id: "first" };
  const second = { id: "second" };
  assert.equal(lifecycle.markReady(first), first);
  assert.equal(lifecycle.markReady(second), first);
  assert.equal(lifecycle.isReady, true);
  assert.equal(await promise, first);
  assert.equal(await lifecycle.whenReady(), first);
});
