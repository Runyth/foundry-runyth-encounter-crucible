// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
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

const PANEL_CLASS = "runyth-encounter-crucible-tracker";
const PANEL_DATASET_KEY = "encounterCrucibleIntegration";
const PANEL_SELECTOR = '[data-encounter-crucible-integration="combat-tracker"]';

function datasetValue(element, attributeName) {
  const key = attributeName.replace(/^data-/, "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return element?.dataset?.[key];
}

function matchSelector(element, selector) {
  const attribute = selector.match(/\[([^\]=~]+)="([^"]*)"\]/);
  if (attribute) {
    const [, attributeName, value] = attribute;
    if (datasetValue(element, attributeName) !== value) return false;
  }
  const className = selector.match(/\.([a-z0-9_-]+)/i);
  if (className && !String(element.className ?? "").split(/\s+/).some((entry) => entry === className[1])) return false;
  return true;
}

function matchesSelectorList(element, selectorList) {
  return selectorList.split(",").some((selector) => matchSelector(element, selector.trim()));
}

function collect(root, selector, results) {
  for (const child of root.children ?? []) {
    if (matchesSelectorList(child, selector)) results.push(child);
    collect(child, selector, results);
  }
}

function fakeElement(tagName = "div", attributes = {}) {
  return {
    tagName,
    nodeType: 1,
    className: attributes.className ?? "",
    dataset: attributes.dataset ?? {},
    children: [],
    isConnected: true,
    removed: false,
    append(child) {
      this.children.push(child);
      child.parentElement = this;
    },
    addEventListener() {},
    remove() {
      this.removed = true;
      this.isConnected = false;
      const parent = this.parentElement;
      if (parent) parent.children = parent.children.filter((child) => child !== this);
    },
    querySelectorAll(selector) {
      const results = [];
      collect(this, selector, results);
      return results;
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    prepend(child) {
      this.children.unshift(child);
      child.parentElement = this;
    }
  };
}

test("Combat Tracker banner stays single-instance across re-render storms", () => {
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

  const target = fakeElement();
  const column = fakeElement();
  column.append(target);
  const root = fakeElement();
  const header = fakeElement("header", { className: "combat-tracker-header" });
  root.append(header);
  header.parentElement = target;
  root.querySelector = (selector) => (selector === ".combat-tracker-header" ? header : root.querySelectorAll(selector)[0] ?? null);

  const staleGuardPanel = fakeElement("section", {
    className: PANEL_CLASS,
    dataset: { encounterCrucibleIntegration: "combat-tracker" }
  });
  const oldDriftPanel = fakeElement("section", {
    className: PANEL_CLASS,
    dataset: { runythEncounterCrucibleIntegration: "combat-tracker" }
  });
  const classOnlyPanel = fakeElement("section", { className: PANEL_CLASS });
  target.prepend(oldDriftPanel);
  target.prepend(classOnlyPanel);
  assert.equal(hasCombatTrackerPanel(root), false, "the drift-era guard could never see these strays");
  assert.equal(target.querySelectorAll(`.${PANEL_CLASS}`).length, 2);

  hookCallback({}, root);
  const live = () => target.querySelectorAll(`.${PANEL_CLASS}`).filter((panel) => !panel.removed);
  assert.equal(live().length, 1, "exactly one mounted banner survives the purge");
  assert.deepEqual([oldDriftPanel.removed, classOnlyPanel.removed], [true, true]);
  const banner = live()[0];
  assert.equal(datasetValue(banner, "data-encounter-crucible-integration"), "combat-tracker", "the banner attribute matches the guard selector");
  assert.equal(datasetValue(banner, "data-runyth-encounter-crucible-integration"), undefined, "no stale attribute spelling is written");
  assert.equal(target.querySelectorAll(PANEL_SELECTOR).length, 1, "the target column holds exactly one banner");
  assert.equal(hasCombatTrackerPanel({ querySelector: (selector) => target.querySelector(selector) ?? null }), true, "the guard reports the surviving banner when the rendered root contains it");

  hookCallback({}, root);
  assert.equal(live().length, 1, "re-renders keep a single banner");
  assert.equal(live()[0].dataset[PANEL_DATASET_KEY], "combat-tracker");
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
