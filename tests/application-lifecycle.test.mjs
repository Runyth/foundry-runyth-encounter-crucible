// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { readStoredPosition, runActionOnce, saveStoredPosition } from "../module/encounter-crucible/scripts/apps/application-lifecycle.js";

const originalGame = globalThis.game;

test.after(() => {
  globalThis.game = originalGame;
});

test("a logical ApplicationV2 action cannot execute twice while pending", async () => {
  const owner = {};
  let executions = 0;
  let complete;
  const gate = new Promise((resolve) => { complete = resolve; });
  const action = async () => {
    executions += 1;
    await gate;
    return "done";
  };

  const first = runActionOnce(owner, "save", action);
  const second = runActionOnce(owner, "save", action);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(executions, 1);
  complete();
  assert.equal(await first, "done");

  await runActionOnce(owner, "save", action);
  assert.equal(executions, 2);
});

test("ApplicationV2 positions persist only supported numeric fields", async () => {
  let stored = { left: 10, top: 20, width: 800, height: 600, ignored: "x" };
  globalThis.game = {
    settings: {
      get() {
        return stored;
      },
      async set(_module, _key, value) {
        stored = value;
      }
    }
  };

  assert.deepEqual(readStoredPosition("dashboardPosition"), { left: 10, top: 20, width: 800, height: 600 });
  await saveStoredPosition("dashboardPosition", { left: 30, top: 40, width: 900, height: 700, extra: true });
  assert.deepEqual(stored, { left: 30, top: 40, width: 900, height: 700 });
});
