// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateAssessment,
  calculate2014Thresholds,
  calculate2024Budget,
  calculateActionEconomy,
  calculateResourcePressure,
  calculateTacticalContext,
  multiplier2014,
  xpForCr
} from "../module/runyth-encounter-crucible/scripts/core/calculations.js";

const party = (...levels) => levels.map((level, index) => ({
  id: `pc-${index}`,
  name: `PC ${index + 1}`,
  side: "party",
  level,
  xp: 0,
  hp: { value: 30, max: 30 },
  spellRatio: 1,
  resourceRatio: 1,
  actions: 1,
  quantity: 1,
  contribution: 1
}));

const enemy = (cr, quantity = 1, extras = {}) => ({
  id: `enemy-${cr}-${quantity}`,
  name: `Enemy CR ${cr}`,
  side: "enemy",
  cr,
  xp: xpForCr(cr),
  hp: { value: 20, max: 20 },
  actions: 1,
  quantity,
  contribution: 1,
  ...extras
});

test("2024 budgets sum mixed character levels instead of averaging them", () => {
  const result = calculate2024Budget(party(3, 5), [enemy(4)]);
  assert.equal(result.metrics.lowBudget, 650);
  assert.equal(result.metrics.moderateBudget, 975);
  assert.equal(result.metrics.highBudget, 1500);
  assert.equal(result.metrics.enemyXp, 1100);
  assert.equal(result.classification, "high");
});

test("2024 budgets respect participant contribution coefficients", () => {
  const members = [...party(5), { ...party(5)[0], id: "hireling", contribution: 0.5 }];
  const result = calculate2024Budget(members, [enemy(4)]);
  assert.equal(result.metrics.moderateBudget, 1125);
  assert.equal(result.classification, "moderate");
});

test("2014 monster multipliers adjust for party size", () => {
  assert.equal(multiplier2014(8, 4), 2.5);
  assert.equal(multiplier2014(8, 2), 3);
  assert.equal(multiplier2014(8, 6), 2);
});

test("2014 adjusted XP accounts for enemy quantity", () => {
  const result = calculate2014Thresholds(party(5, 5, 5, 5), [enemy(0.25, 8)]);
  assert.equal(result.metrics.rawXp, 400);
  assert.equal(result.metrics.multiplier, 2.5);
  assert.equal(result.metrics.adjustedXp, 1000);
  assert.equal(result.classification, "easy");
});



test("official rules models report zero confidence without a valid party", () => {
  const rules2024 = calculate2024Budget([], [enemy(1)]);
  const rules2014 = calculate2014Thresholds([], [enemy(1)]);

  assert.equal(rules2024.confidence, 0);
  assert.equal(rules2014.confidence, 0);
  assert.deepEqual(rules2024.warnings, ["missing-party-levels"]);
  assert.deepEqual(rules2014.warnings, ["missing-party-levels"]);
});

test("2014 multiplier remains neutral for an empty enemy roster", () => {
  assert.equal(multiplier2014(0, 4), 1);
});

test("action economy weights bonus, reaction, legendary, and lair actions", () => {
  const result = calculateActionEconomy(
    [{ ...party(5)[0], quantity: 4 }],
    [enemy(5, 1, { bonusActions: 1, reactions: 1, legendaryActions: 3, lairActions: 1 })]
  );
  assert.equal(result.metrics.partyEffectiveActions, 4);
  assert.equal(result.metrics.enemyEffectiveActions, 4.55);
  assert.equal(result.classification, "challenging");
});

test("resource pressure reports a depleted party", () => {
  const result = calculateResourcePressure([
    { ...party(5)[0], hp: { value: 10, max: 40 }, spellRatio: 0.25, resourceRatio: 0.5 },
    { ...party(5)[0], id: "pc-2", hp: { value: 20, max: 40 }, spellRatio: 0.5, resourceRatio: 0.5 }
  ]);
  assert.equal(result.metrics.hpRemaining, 0.375);
  assert.ok(result.metrics.effectivePartyStrength < 0.5);
  assert.equal(result.metrics.severityAdjustment, 1.5);
  assert.ok(result.warnings.includes("party-depleted"));
});

test("opposing tactical factors remain explainable and cancel numerically", () => {
  const result = calculateTacticalContext({ partySurprised: true, enemiesSurprised: true });
  assert.equal(result.metrics.factorCount, 2);
  assert.equal(result.metrics.severityAdjustment, 0);
  assert.deepEqual(result.factors.map((factor) => factor.key), ["partySurprised", "enemiesSurprised"]);
});

test("aggregate assessment keeps individual rules models visible", () => {
  const context = {
    party: party(5, 5, 5, 5),
    enemies: [enemy(0.25, 8)],
    conditions: { enemyPrepared: true }
  };
  const result = aggregateAssessment(context);
  assert.equal(result.models.rules2024.metrics.enemyXp, 400);
  assert.equal(result.models.rules2014.metrics.adjustedXp, 1000);
  assert.equal(result.models.tactical.metrics.factorCount, 1);
  assert.ok(["trivial", "manageable", "challenging", "dangerous", "extreme"].includes(result.classification));
});
