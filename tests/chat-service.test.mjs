// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { buildEncounterSummaryContent, postEncounterSummary } from "../module/runyth-encounter-crucible/scripts/services/chat-service.js";

const originalGame = globalThis.game;
const originalFoundry = globalThis.foundry;

function encounter() {
  return {
    name: "Mill <Ambush>",
    assessment: {
      classification: "dangerous",
      volatility: { id: "high" },
      confidence: { id: "medium" },
      models: {
        rules2024: { classification: "high" },
        rules2014: { classification: "deadly" },
        actionEconomy: { classification: "dangerous" }
      }
    }
  };
}

test.after(() => {
  globalThis.game = originalGame;
  globalThis.foundry = originalFoundry;
});

test("one summary action creates exactly one Chat card", async () => {
  const created = [];
  globalThis.game = {
    user: { isGM: true },
    i18n: { localize: (key) => key },
    settings: { get: () => "hidden" }
  };
  globalThis.foundry = {
    documents: {
      ChatMessage: {
        getSpeaker: () => ({ alias: "GM" }),
        getWhisperRecipients: () => [{ id: "gm-1" }, { id: "gm-2" }],
        async create(data) {
          created.push(data);
          return { id: "message-1", ...data };
        }
      }
    }
  };

  const result = await postEncounterSummary(encounter());
  assert.equal(result.id, "message-1");
  assert.equal(created.length, 1);
  assert.deepEqual(created[0].whisper, ["gm-1", "gm-2"]);
  assert.match(created[0].content, /Mill &lt;Ambush&gt;/);
});

test("vague summaries omit rules-model details", () => {
  globalThis.game = { i18n: { localize: (key) => key } };
  const content = buildEncounterSummaryContent(encounter(), "vague");
  assert.match(content, /dangerous/);
  assert.doesNotMatch(content, /Rules2024/);
  assert.doesNotMatch(content, /deadly/);
});

test("players cannot create module-owned summary cards", async () => {
  globalThis.game = { user: { isGM: false } };
  await assert.rejects(() => postEncounterSummary(encounter()), /Only a GM/);
});
