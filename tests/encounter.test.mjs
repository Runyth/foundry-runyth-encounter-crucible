// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  createEncounterDefinition,
  formatEncounterName,
  generateEncounter,
  resolveCompositionMode,
  targetBudgetForDifficulty
} from "../module/runyth-encounter-crucible/scripts/core/encounter.js";

const party = [
  { id: "pc-a", name: "A", side: "party", level: 5, quantity: 1, contribution: 1, hp: { value: 40, max: 40 }, actions: 1 },
  { id: "pc-b", name: "B", side: "party", level: 5, quantity: 1, contribution: 1, hp: { value: 40, max: 40 }, actions: 1 },
  { id: "pc-c", name: "C", side: "party", level: 5, quantity: 1, contribution: 1, hp: { value: 40, max: 40 }, actions: 1 },
  { id: "pc-d", name: "D", side: "party", level: 5, quantity: 1, contribution: 1, hp: { value: 40, max: 40 }, actions: 1 }
];

const candidates = [
  { id: "kobold", actorUuid: "Actor.kobold", name: "Kobold", cr: 0.125, xp: 25, actions: 1 },
  { id: "goblin", actorUuid: "Actor.goblin", name: "Goblin", cr: 0.25, xp: 50, actions: 1 },
  { id: "orc", actorUuid: "Actor.orc", name: "Orc", cr: 0.5, xp: 100, actions: 1 },
  { id: "ogre", actorUuid: "Actor.ogre", name: "Ogre", cr: 2, xp: 450, actions: 1 },
  { id: "troll", actorUuid: "Actor.troll", name: "Troll", cr: 5, xp: 1800, actions: 1 }
];

test("composition preference combinations have stable documented semantics", () => {
  assert.equal(resolveCompositionMode({}), "neutral");
  assert.equal(resolveCompositionMode({ preferQuantity: true }), "quantity");
  assert.equal(resolveCompositionMode({ preferStrength: true }), "strength");
  assert.equal(resolveCompositionMode({ preferQuantity: true, preferStrength: true }), "hybrid");
  assert.equal(resolveCompositionMode({ preferQuantity: true, preferStrength: true, fixedGroupSize: 3 }), "fixed");
});

test("target budgets increase monotonically with requested difficulty", () => {
  const values = ["trivial", "low", "moderate", "high", "extreme"].map((target) => targetBudgetForDifficulty(party, target));
  assert.deepEqual(values, [900, 2000, 3000, 4400, 5940]);
});

test("encounter generation explores variable group sizes instead of always choosing maximum", () => {
  const encounter = generateEncounter({
    party,
    candidates,
    target: "moderate",
    minimumCount: 1,
    maximumCount: 10,
    allowDuplicates: true,
    preferStrength: true
  });
  const count = encounter.enemies.reduce((total, entry) => total + entry.quantity, 0);
  assert.ok(count >= 1 && count < 10);
  assert.ok(encounter.generation.actualXp > 0);
  assert.equal(encounter.generation.minimumCount, 1);
  assert.equal(encounter.generation.maximumCount, 10);
  assert.doesNotThrow(() => JSON.stringify(encounter));
});

test("fixed group size overrides quantity and strength preferences", () => {
  const encounter = generateEncounter({
    party,
    candidates,
    target: "high",
    fixedGroupSize: 4,
    preferQuantity: true,
    preferStrength: true,
    allowDuplicates: true
  });
  const count = encounter.enemies.reduce((total, entry) => total + entry.quantity, 0);
  assert.equal(encounter.generation.compositionMode, "fixed");
  assert.equal(count, 4);
});

test("no-duplicate generation uses each Actor at most once", () => {
  const encounter = generateEncounter({
    party,
    candidates,
    target: "moderate",
    maximumCount: 5,
    allowDuplicates: false
  });
  assert.ok(encounter.enemies.every((entry) => entry.quantity === 1));
  assert.equal(new Set(encounter.enemies.map((entry) => entry.actorUuid)).size, encounter.enemies.length);
});

test("boss generation includes the strongest available candidate", () => {
  const encounter = generateEncounter({
    party,
    candidates,
    target: "high",
    maximumCount: 6,
    allowDuplicates: true,
    boss: true
  });
  assert.ok(encounter.enemies.some((entry) => entry.id === "troll"));
});

test("saved encounter names support all documented tokens", () => {
  const encounter = createEncounterDefinition({
    name: "Mill Assault",
    theme: "Bandits",
    party,
    enemies: [candidates[3]]
  });
  encounter.assessment = {
    classification: "dangerous",
    volatility: { id: "high" }
  };
  const name = formatEncounterName(
    "{date} - {theme} - {name} - L{partyLevel} - P{partySize} - {difficulty} - {volatility}",
    encounter,
    new Date("2026-07-25T12:00:00.000Z")
  );
  assert.equal(name, "2026-07-25 - Bandits - Mill Assault - L5 - P4 - dangerous - high");
});
