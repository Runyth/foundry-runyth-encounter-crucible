// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyToken,
  normalizeActor,
  normalizeToken
} from "../module/runyth-encounter-crucible/scripts/services/actor-normalizer.js";

const originalGame = globalThis.game;
const originalConst = globalThis.CONST;

test.beforeEach(() => {
  globalThis.game = { system: { id: "dnd5e", version: "5.2.2" } };
  globalThis.CONST = { TOKEN_DISPOSITIONS: { FRIENDLY: 1, NEUTRAL: 0, HOSTILE: -1 } };
});

test.after(() => {
  globalThis.game = originalGame;
  globalThis.CONST = originalConst;
});

test("normalizes a D&D 5e character including resource pressure inputs", () => {
  const actor = {
    id: "hero",
    uuid: "Actor.hero",
    name: "Hero",
    type: "character",
    hasPlayerOwner: true,
    system: {
      details: { level: 7 },
      attributes: { hp: { value: 28, max: 42, temp: 3 }, ac: { value: 17 } },
      spells: {
        spell1: { value: 2, max: 4, level: 1 },
        spell3: { value: 1, max: 2, level: 3 }
      },
      resources: {
        primary: { value: 1, max: 3 }
      }
    },
    items: [
      { system: { activation: { type: "bonus" }, uses: { value: 1, max: 2 } } },
      { system: { activation: { type: "reaction" } } }
    ]
  };
  const result = normalizeActor(actor, { side: "party" });
  assert.equal(result.level, 7);
  assert.equal(result.hp.value, 28);
  assert.equal(result.hp.max, 42);
  assert.equal(result.hp.temporary, 3);
  assert.equal(result.ac, 17);
  assert.equal(result.bonusActions, 1);
  assert.equal(result.reactions, 1);
  assert.ok(result.spellRatio > 0 && result.spellRatio < 1);
  assert.ok(result.resourceRatio > 0 && result.resourceRatio < 1);
  assert.equal(result.source.systemVersion, "5.2.2");
});

test("spell-slot pressure derives level weights from D&D 5e slot keys", () => {
  const actor = {
    id: "caster",
    uuid: "Actor.caster",
    name: "Caster",
    type: "character",
    system: {
      details: { level: 9 },
      attributes: { hp: { value: 30, max: 30 }, ac: { value: 15 } },
      spells: {
        spell1: { value: 4, max: 4 },
        spell5: { value: 0, max: 2 }
      },
      resources: {}
    },
    items: []
  };
  const result = normalizeActor(actor, { side: "party" });
  assert.equal(result.spellRatio, 4 / 14);
});

test("normalizes fractional NPC challenge rating and derives XP", () => {
  const actor = {
    id: "wolf",
    uuid: "Actor.wolf",
    name: "Wolf",
    type: "npc",
    system: {
      details: { cr: "1/4", xp: { value: 0 } },
      attributes: { hp: { value: 11, max: 11 }, ac: { value: 13 } }
    },
    items: []
  };
  const result = normalizeActor(actor, { side: "enemy" });
  assert.equal(result.cr, 0.25);
  assert.equal(result.xp, 50);
});

test("token classification prioritizes player ownership and disposition", () => {
  assert.equal(classifyToken({ actor: { type: "character", hasPlayerOwner: true }, disposition: -1 }), "party");
  assert.equal(classifyToken({ actor: { type: "npc" }, disposition: -1 }), "enemy");
  assert.equal(classifyToken({ actor: { type: "npc" }, disposition: 1 }), "ally");
  assert.equal(classifyToken({ actor: { type: "npc" }, disposition: 0 }), "neutral");
});

test("normalizing an allied Token applies the default ally coefficient", () => {
  const token = {
    id: "token",
    uuid: "Scene.scene.Token.token",
    disposition: 1,
    actor: {
      id: "guard",
      uuid: "Actor.guard",
      name: "Guard",
      type: "npc",
      system: {
        details: { cr: 1, xp: { value: 200 } },
        attributes: { hp: { value: 15, max: 15 }, ac: { value: 16 } }
      },
      items: []
    }
  };
  const result = normalizeToken(token);
  assert.equal(result.side, "ally");
  assert.equal(result.contribution, 0.5);
  assert.equal(result.tokenUuid, token.uuid);
});
