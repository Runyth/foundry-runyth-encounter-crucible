// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  analyseCombatPreview,
  clearCombatPreviewCache,
  combatPreviewFingerprint,
  hasCombatTrackerPanel,
  registerCombatTrackerIntegration
} from "../module/runyth-encounter-crucible/scripts/combat-tracker.js";

const originalGame = globalThis.game;
const originalHooks = globalThis.Hooks;
const originalDocument = globalThis.document;

test.after(() => {
  globalThis.game = originalGame;
  globalThis.Hooks = originalHooks;
  globalThis.document = originalDocument;
});

function fakeElement(tagName = "div") {
  return {
    tagName,
    nodeType: 1,
    className: "",
    dataset: {},
    children: [],
    isConnected: true,
    append(child) {
      this.children.push(child);
    },
    addEventListener() {},
    querySelector() {
      return null;
    },
    prepend(child) {
      this.children.unshift(child);
      this._panel = child;
    }
  };
}

test("Combat Tracker hook and panel insertion remain idempotent", () => {
  let hookCallback;
  let registrations = 0;
  globalThis.Hooks = {
    on(name, callback) {
      assert.equal(name, "renderCombatTracker");
      registrations += 1;
      hookCallback = callback;
      return 77;
    }
  };
  globalThis.game = {
    user: { isGM: true },
    combat: null,
    i18n: { localize: (key) => key },
    settings: { get: () => true }
  };
  globalThis.document = { createElement: (tag) => fakeElement(tag) };
  const api = { openWorkshop() {}, openDashboard() {}, analyseCombat() {} };

  assert.equal(registerCombatTrackerIntegration(api), 77);
  assert.equal(registerCombatTrackerIntegration(api), 77);
  assert.equal(registrations, 1);

  const root = fakeElement();
  root.querySelector = (selector) => {
    if (selector === '[data-runyth-encounter-crucible-integration="combat-tracker"]') return root._panel ?? null;
    return null;
  };

  hookCallback({}, root);
  assert.equal(root.children.length, 1);
  assert.equal(hasCombatTrackerPanel(root), true);
  hookCallback({}, root);
  assert.equal(root.children.length, 1);
});

test("Combat Tracker previews reuse identical combat state and invalidate on Actor changes", async () => {
  clearCombatPreviewCache();
  globalThis.game = {
    settings: { get: () => true }
  };
  const actor = {
    id: "actor-1",
    _stats: { modifiedTime: 1 },
    system: {
      attributes: { hp: { value: 10, max: 10 } },
      spells: {},
      resources: {}
    }
  };
  const combat = {
    id: "combat-1",
    round: 1,
    turn: 0,
    combatants: { contents: [{ id: "c1", actor, tokenId: "t1", isDefeated: false }] }
  };
  let analyses = 0;
  const api = {
    async analyseCombat() {
      analyses += 1;
      return { id: analyses };
    }
  };
  const firstFingerprint = combatPreviewFingerprint(combat);
  const first = analyseCombatPreview(api, combat);
  const second = analyseCombatPreview(api, combat);
  assert.equal(first, second);
  await first;
  assert.equal(analyses, 1);
  actor.system.attributes.hp.value = 9;
  assert.notEqual(combatPreviewFingerprint(combat), firstFingerprint);
  await analyseCombatPreview(api, combat);
  assert.equal(analyses, 2);
});
