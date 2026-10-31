// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { generateEncounter } from "../module/encounter-crucible/scripts/core/encounter.js";
import { generateEncounterAsync } from "../module/encounter-crucible/scripts/services/generation-service.js";

const originalWorker = globalThis.Worker;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;

const party = [{ id: "p1", name: "P1", level: 5, side: "party", quantity: 1, contribution: 1, hp: { value: 30, max: 30 }, actions: 1 }];
const candidates = [{ id: "goblin", actorUuid: "Actor.goblin", name: "Goblin", cr: 0.25, xp: 50, actions: 1 }];

test.afterEach(() => {
  globalThis.Worker = originalWorker;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
});

test("worker-backed generation reports progress without executing the search on the caller stack", async () => {
  let posted = false;
  let terminated = false;
  class FakeWorker {
    listeners = new Map();
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }
    postMessage(message) {
      posted = true;
      setImmediate(() => {
        this.listeners.get("message")?.({ data: { id: message.id, type: "progress", progress: { depth: 1, maximumDepth: 2 } } });
        const encounter = generateEncounter(message.input);
        this.listeners.get("message")?.({ data: { id: message.id, type: "result", encounter } });
      });
    }
    terminate() {
      terminated = true;
    }
  }
  globalThis.Worker = FakeWorker;
  const progress = [];
  const promise = generateEncounterAsync({ party, candidates, maximumCount: 2 }, { onProgress: (value) => progress.push(value) });
  assert.equal(posted, true);
  assert.equal(progress.length, 0);
  const encounter = await promise;
  assert.equal(encounter.enemies.length, 1);
  assert.deepEqual(progress, [{ depth: 1, maximumDepth: 2 }]);
  assert.equal(terminated, true);
});

test("cooperative fallback yields to the browser and remains cancellable", async () => {
  globalThis.Worker = undefined;
  let frames = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames += 1;
    setImmediate(callback);
    return frames;
  };
  const controller = new AbortController();
  const manyCandidates = Array.from({ length: 80 }, (_, index) => ({
    id: `enemy-${index}`,
    actorUuid: `Actor.enemy-${index}`,
    name: `Enemy ${index}`,
    xp: 25 + index,
    cr: 0.125,
    actions: 1
  }));
  const promise = generateEncounterAsync({ party, candidates: manyCandidates, maximumCount: 12 }, { signal: controller.signal });
  setImmediate(() => controller.abort());
  await assert.rejects(promise, (error) => error?.name === "AbortError");
  assert.ok(frames > 0);
});
