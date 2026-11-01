// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "./core/constants.js";

let settingsRegistered = false;

export function registerSettings({ launcherType, onRelevantChange = null }) {
  if (settingsRegistered) return false;
  const register = (key, data, refresh = false) => globalThis.game.settings.register(MODULE_ID, key, {
    ...data,
    ...(refresh ? { onChange: () => onRelevantChange?.(key) } : {})
  });

  globalThis.game.settings.registerMenu(MODULE_ID, "openWorkshop", {
    name: "EC.Settings.OpenWorkshop.Name",
    label: "EC.Settings.OpenWorkshop.Label",
    hint: "EC.Settings.OpenWorkshop.Hint",
    icon: "fa-solid fa-scale-balanced",
    type: launcherType,
    restricted: true
  });
  register("showCombatTrackerBanner", {
    name: "EC.Settings.ShowBanner.Name",
    hint: "EC.Settings.ShowBanner.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  }, true);
  register("includeCurrentResources", {
    name: "EC.Settings.Resources.Name",
    hint: "EC.Settings.Resources.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  }, true);
  register("includeDefeatedCombatants", {
    name: "EC.Settings.Defeated.Name",
    hint: "EC.Settings.Defeated.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  }, true);
  register("allyContribution", {
    name: "EC.Settings.AllyContribution.Name",
    hint: "EC.Settings.AllyContribution.Hint",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 1.5, step: 0.05 },
    default: 0.5
  }, true);
  register("playerVisibility", {
    name: "EC.Settings.PlayerVisibility.Name",
    hint: "EC.Settings.PlayerVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      hidden: "EC.Settings.PlayerVisibility.Hidden",
      vague: "EC.Settings.PlayerVisibility.Vague",
      full: "EC.Settings.PlayerVisibility.Full"
    },
    default: "hidden"
  });
  register("journalRootFolder", {
    name: "EC.Settings.JournalFolder.Name",
    hint: "EC.Settings.JournalFolder.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "Runyth Encounter Crucible"
  });
  register("savedNameFormat", {
    name: "EC.Settings.NameFormat.Name",
    hint: "EC.Settings.NameFormat.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "{date} - {theme} - {name}"
  });
  register("rememberLastEncounter", {
    name: "EC.Settings.Remember.Name",
    hint: "EC.Settings.Remember.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  register("lastEncounter", {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });
  register("dashboardPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  register("workshopPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
  register("debugLogging", {
    name: "EC.Settings.Debug.Name",
    hint: "EC.Settings.Debug.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  settingsRegistered = true;
  return true;
}
