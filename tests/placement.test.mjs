// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import {
  createCombatFromTokens,
  placeAndCreateCombat,
  placeEncounter
} from "../module/encounter-crucible/scripts/services/placement-service.js";

const originalGame = globalThis.game;
const originalCanvas = globalThis.canvas;
const originalFoundry = globalThis.foundry;
const originalFromUuid = globalThis.fromUuid;

function sceneStub() {
  return {
    id: "scene-1",
    uuid: "Scene.scene-1",
    grid: { size: 100 },
    async createEmbeddedDocuments() {
      return [];
    },
    async deleteEmbeddedDocuments() {}
  };
}

test.beforeEach(() => {
  globalThis.game = { user: { isGM: true } };
  globalThis.canvas = { scene: sceneStub(), stage: { pivot: { x: 0, y: 0 } } };
});

test.after(() => {
  globalThis.game = originalGame;
  globalThis.canvas = originalCanvas;
  globalThis.foundry = originalFoundry;
  globalThis.fromUuid = originalFromUuid;
});

test("placement rejects empty or unresolvable rosters instead of reporting false success", async () => {
  await assert.rejects(
    () => placeEncounter({ enemies: [], allies: [], neutral: [] }),
    /no placeable/
  );

  globalThis.fromUuid = async () => null;
  await assert.rejects(
    () => placeEncounter({ enemies: [{ actorUuid: "Actor.missing", quantity: 1 }], allies: [], neutral: [] }),
    /None of the encounter participants/
  );
});

test("partial Combat creation is rolled back when combatants cannot be created", async () => {
  let deleted = 0;
  let createdData = null;
  const combat = {
    id: "combat-1",
    async createEmbeddedDocuments() {
      throw new Error("combatant failure");
    },
    async delete() {
      deleted += 1;
    }
  };
  globalThis.foundry = {
    documents: {
      Combat: {
        async create(data) {
          createdData = data;
          return combat;
        }
      }
    }
  };

  await assert.rejects(
    () => createCombatFromTokens([{ id: "token-1", actorId: "actor-1", hidden: false }]),
    /combatant failure/
  );
  assert.equal(createdData.active, false);
  assert.equal(deleted, 1);
});

test("placed Tokens are rolled back when Combat creation fails", async () => {
  const deletedTokenIds = [];
  const scene = sceneStub();
  scene.createEmbeddedDocuments = async () => [{ id: "token-1", uuid: "Scene.scene-1.Token.token-1", actorId: "actor-1", hidden: false }];
  scene.deleteEmbeddedDocuments = async (_type, ids) => deletedTokenIds.push(...ids);
  globalThis.canvas.scene = scene;
  globalThis.fromUuid = async () => ({
    id: "actor-1",
    async getTokenDocument(data) {
      return { ...data, toObject: () => data };
    }
  });
  globalThis.foundry = {
    documents: {
      Combat: {
        async create() {
          throw new Error("combat creation failure");
        }
      }
    }
  };
  const encounter = {
    name: "Rollback Test",
    enemies: [{ actorUuid: "Actor.actor-1", quantity: 1 }],
    allies: [],
    neutral: []
  };

  await assert.rejects(() => placeAndCreateCombat(encounter), /combat creation failure/);
  assert.deepEqual(deletedTokenIds, ["token-1"]);
  assert.deepEqual(encounter.placedTokenUuids, []);
});

test("Token source documents are resolved concurrently while preserving placement order", async () => {
  const pending = new Map();
  const started = [];
  globalThis.fromUuid = (uuid) => new Promise((resolve) => {
    started.push(uuid);
    pending.set(uuid, resolve);
  });
  const createdPayloads = [];
  globalThis.canvas.scene.createEmbeddedDocuments = async (_type, payloads) => {
    createdPayloads.push(...payloads);
    return payloads.map((payload, index) => ({ ...payload, id: `token-${index}`, uuid: `Scene.scene-1.Token.token-${index}` }));
  };
  const encounter = {
    enemies: [
      { actorUuid: "Actor.first", quantity: 1 },
      { actorUuid: "Actor.second", quantity: 1 }
    ],
    allies: [],
    neutral: []
  };
  const placement = placeEncounter(encounter);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(started, ["Actor.first", "Actor.second"]);
  pending.get("Actor.second")({
    async getTokenDocument(data) {
      return { toObject: () => ({ ...data, name: "second" }) };
    }
  });
  pending.get("Actor.first")({
    async getTokenDocument(data) {
      return { toObject: () => ({ ...data, name: "first" }) };
    }
  });
  await placement;
  assert.deepEqual(createdPayloads.map((entry) => entry.name), ["first", "second"]);
});
