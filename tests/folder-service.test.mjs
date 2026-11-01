// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { actorsInFolder, descendantActorFolders } from "../module/runyth-encounter-crucible/scripts/services/folder-service.js";

const originalGame = globalThis.game;

test.afterEach(() => {
  globalThis.game = originalGame;
});

test("recursive Actor folder discovery is cycle-safe and deduplicated", () => {
  const folders = [
    { id: "root", type: "Actor", folder: null },
    { id: "child", type: "Actor", folder: "root" },
    { id: "grandchild", type: "Actor", folder: { id: "child" } },
    { id: "cycle-a", type: "Actor", folder: "cycle-b" },
    { id: "cycle-b", type: "Actor", folder: "cycle-a" },
    { id: "item-folder", type: "Item", folder: "root" }
  ];
  globalThis.game = {
    folders: {
      contents: folders,
      get(id) {
        return folders.find((folder) => folder.id === id);
      }
    },
    actors: {
      contents: [
        { id: "actor-root", type: "npc", folder: "root" },
        { id: "actor-child", type: "npc", folder: { id: "child" } },
        { id: "actor-grandchild", type: "npc", folder: "grandchild" },
        { id: "actor-unrelated", type: "npc", folder: "cycle-a" }
      ]
    }
  };

  assert.deepEqual(descendantActorFolders(folders[0]).map((folder) => folder.id), ["child", "grandchild"]);
  assert.deepEqual(actorsInFolder("root", true).map((actor) => actor.id), [
    "actor-root",
    "actor-child",
    "actor-grandchild"
  ]);
  assert.deepEqual(actorsInFolder("root", false).map((actor) => actor.id), ["actor-root"]);
});

test("folder labels and normalized candidates are cached until Foundry invalidation", () => {
  const folders = [{ id: "root", name: "Root", type: "Actor", folder: null }];
  const actor = {
    id: "npc-1",
    uuid: "Actor.npc-1",
    name: "First Name",
    type: "npc",
    folder: "root",
    system: {
      details: { cr: 1, xp: { value: 200 } },
      attributes: { hp: { value: 10, max: 10 }, ac: { value: 12 } },
      resources: {},
      spells: {}
    },
    items: []
  };
  globalThis.game = {
    system: { id: "dnd5e", version: "5.3.0" },
    folders: { contents: folders, get: (id) => folders.find((folder) => folder.id === id) },
    actors: { contents: [actor] }
  };
  return import("../module/runyth-encounter-crucible/scripts/services/folder-service.js").then((service) => {
    service.invalidateActorFolderCache();
    service.invalidateActorCandidateCache();
    assert.equal(service.actorFolderOptions()[0].name, "Root");
    assert.equal(service.actorCandidates()[0].name, "First Name");
    folders[0].name = "Renamed";
    actor.name = "Second Name";
    assert.equal(service.actorFolderOptions()[0].name, "Root");
    assert.equal(service.actorCandidates()[0].name, "First Name");
    service.invalidateActorFolderCache();
    service.invalidateActorCandidateCache(actor);
    assert.equal(service.actorFolderOptions()[0].name, "Renamed");
    assert.equal(service.actorCandidates()[0].name, "Second Name");
  });
});
