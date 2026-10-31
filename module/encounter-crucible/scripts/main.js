// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { EncounterCrucibleDashboard } from "./apps/dashboard.js";
import { EncounterCrucibleSettingsLauncher, EncounterCrucibleWorkshop } from "./apps/workshop.js";
import { createApi } from "./api.js";
import { registerCombatTrackerIntegration } from "./combat-tracker.js";
import { API_VERSION, MODULE_ID, MODULE_VERSION } from "./core/constants.js";
import { createLifecycleGate, exposeApi } from "./core/lifecycle.js";
import { requireCurrentUserGM } from "./core/permissions.js";
import { registerRuntimeRefreshHooks } from "./integrations/runtime-refresh.js";
import { registerSceneControlsIntegration } from "./integrations/scene-controls.js";
import { registerSettings } from "./settings.js";

let dashboard = null;
let workshop = null;
let api = null;
const lifecycle = createLifecycleGate();

function debug(...args) {
  if (globalThis.game?.settings?.get(MODULE_ID, "debugLogging")) console.debug(`[${MODULE_ID}]`, ...args);
}

function reportSubsystemFailure(subsystem, error) {
  console.error(`[${MODULE_ID}] ${subsystem} failed to initialize.`, error);
  if (globalThis.game?.user?.isGM) {
    globalThis.ui?.notifications?.warn?.(`Encounter Crucible: ${subsystem} is unavailable. See the browser console.`);
  }
}

function safelyInitialize(subsystem, callback) {
  try {
    return callback();
  } catch (error) {
    reportSubsystemFailure(subsystem, error);
    return null;
  }
}

async function rememberEncounter(encounter) {
  if (!globalThis.game?.user?.isGM) return;
  if (!globalThis.game.settings.get(MODULE_ID, "rememberLastEncounter")) return;
  await globalThis.game.settings.set(MODULE_ID, "lastEncounter", encounter);
}

function openDashboard(encounter = null) {
  requireCurrentUserGM("open the Encounter Crucible Dashboard");
  const publicApi = exposePublicApi();
  if (!dashboard) dashboard = new EncounterCrucibleDashboard({ encounter, api: publicApi });
  if (encounter) dashboard.setEncounter(encounter);
  void dashboard.render({ force: true });
  return dashboard;
}

function openWorkshop(encounter = null) {
  requireCurrentUserGM("open the Encounter Crucible Workshop");
  const publicApi = exposePublicApi();
  if (!workshop) workshop = new EncounterCrucibleWorkshop({ encounter, api: publicApi });
  else if (encounter) workshop.setEncounter(encounter);
  void workshop.render({ force: true });
  return workshop;
}

function invalidateOpenWindows() {
  if (dashboard?.rendered) void dashboard.render({ force: true });
  if (workshop?.rendered) void workshop.render({ force: true });
}

function refreshOwnedUi() {
  globalThis.ui?.combat?.render?.();
  invalidateOpenWindows();
}

function getOpenEncounters() {
  return [dashboard?.encounter, workshop?.generated].filter(Boolean);
}

function exposePublicApi() {
  if (!api) api = createApi({ openDashboard, openWorkshop, rememberEncounter, lifecycle });
  exposeApi(globalThis.game, MODULE_ID, api);
  return api;
}

// Required modules may inspect the public API before their own init callback.
// Expose it as soon as this ES module is evaluated, then repeat idempotently at init.
exposePublicApi();

globalThis.Hooks.once("init", () => {
  const publicApi = exposePublicApi();
  registerSettings({ launcherType: EncounterCrucibleSettingsLauncher, onRelevantChange: refreshOwnedUi });

  safelyInitialize("Scene Controls integration", () => registerSceneControlsIntegration(openWorkshop));
  safelyInitialize("Combat Tracker integration", () => registerCombatTrackerIntegration(publicApi));
  safelyInitialize("runtime refresh hooks", () => registerRuntimeRefreshHooks({ invalidateOpenWindows, getOpenEncounters }));

  globalThis.Hooks.callAll("encounterCrucibleReady", publicApi);
  console.info(`[${MODULE_ID}] Initialized v${MODULE_VERSION} with Helper API ${API_VERSION}.`);
});

globalThis.Hooks.once("ready", () => {
  const publicApi = exposePublicApi();
  lifecycle.markReady(publicApi);
  if (globalThis.game.system.id !== "dnd5e") {
    globalThis.ui.notifications.warn(globalThis.game.i18n.localize("EC.Warning.UnsupportedSystem"));
  }
  const last = globalThis.game.settings.get(MODULE_ID, "lastEncounter");
  if (last?.id) debug("Restored last encounter", last.name);
  globalThis.Hooks.callAll("encounterCrucibleApiReady", publicApi);
});
