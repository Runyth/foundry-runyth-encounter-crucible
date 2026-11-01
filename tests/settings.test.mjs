// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { registerSettings } from "../module/runyth-encounter-crucible/scripts/settings.js";

const originalGame = globalThis.game;

test.after(() => {
  globalThis.game = originalGame;
});

test("settings and menus register once with client-scoped window positions", () => {
  const settings = new Map();
  let menus = 0;
  globalThis.game = {
    settings: {
      registerMenu() {
        menus += 1;
      },
      register(_module, key, data) {
        settings.set(key, data);
      }
    }
  };

  assert.equal(registerSettings({ launcherType: class {} }), true);
  assert.equal(registerSettings({ launcherType: class {} }), false);
  assert.equal(menus, 1);
  assert.equal(settings.get("dashboardPosition").scope, "client");
  assert.equal(settings.get("workshopPosition").scope, "client");
  assert.equal(settings.get("lastEncounter").config, false);
});
