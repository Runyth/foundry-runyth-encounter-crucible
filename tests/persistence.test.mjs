// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { encounterHtml } from "../module/runyth-encounter-crucible/scripts/services/persistence-service.js";

test("saved Journal HTML escapes encounter and participant names", () => {
  const html = encounterHtml({
    name: '<script>alert("x")</script>',
    theme: "Unsafe & Theme",
    party: [{ name: "<b>Hero</b>", quantity: 1, level: 5, xp: 0 }],
    enemies: [{ name: 'Wolf "Alpha"', quantity: 1, cr: 1, xp: 200 }],
    assessment: {
      classification: "challenging",
      volatility: { id: "medium" },
      confidence: { id: "high" },
      models: {}
    }
  });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>Hero<\/b>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Unsafe &amp; Theme/);
  assert.match(html, /Wolf &quot;Alpha&quot;/);
});

import { saveEncounter } from "../module/runyth-encounter-crucible/scripts/services/persistence-service.js";

const originalGame = globalThis.game;
const originalFoundry = globalThis.foundry;

test.afterEach(() => {
  globalThis.game = originalGame;
  globalThis.foundry = originalFoundry;
});

function persistenceEnvironment(journal) {
  const folders = [];
  globalThis.game = {
    user: { isGM: true },
    i18n: { localize: (key) => key },
    settings: {
      get(_module, key) {
        if (key === "journalRootFolder") return "Runyth Encounter Crucible";
        if (key === "savedNameFormat") return "{name}";
        return null;
      }
    },
    folders: { contents: folders }
  };
  globalThis.foundry = {
    documents: {
      Folder: {
        async create(data) {
          const folder = { id: `folder-${folders.length + 1}`, ...data };
          folders.push(folder);
          return folder;
        }
      },
      JournalEntry: {
        async create() {
          return journal;
        }
      }
    }
  };
}

function saveableEncounter() {
  return {
    schemaVersion: 4,
    name: "Persistent Encounter",
    theme: "Regression",
    party: [],
    enemies: [],
    assessment: null
  };
}

test("saved Journal flags receive the final Journal UUID", async () => {
  let storedEncounter = null;
  const journal = {
    uuid: "JournalEntry.saved",
    async setFlag(_module, _key, encounter) {
      storedEncounter = structuredClone(encounter);
    }
  };
  persistenceEnvironment(journal);
  const encounter = saveableEncounter();

  assert.equal(await saveEncounter(encounter), journal);
  assert.equal(encounter.journalUuid, journal.uuid);
  assert.equal(storedEncounter.journalUuid, journal.uuid);
});

test("failed final Journal persistence rolls back the partial Journal", async () => {
  let deleted = 0;
  const journal = {
    uuid: "JournalEntry.partial",
    async setFlag() {
      throw new Error("flag write failed");
    },
    async delete() {
      deleted += 1;
    }
  };
  persistenceEnvironment(journal);

  await assert.rejects(() => saveEncounter(saveableEncounter()), /flag write failed/);
  assert.equal(deleted, 1);
});
