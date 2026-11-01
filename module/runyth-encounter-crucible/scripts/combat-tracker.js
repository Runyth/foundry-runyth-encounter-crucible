// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "./core/constants.js";
import { runActionOnce } from "./apps/application-lifecycle.js";

const PANEL_SELECTOR = '[data-runyth-encounter-crucible-integration="combat-tracker"]';
let combatTrackerHookId = null;
let previewCache = null;

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function rootElement(html) {
  return html?.nodeType === 1 ? html : null;
}

export function hasCombatTrackerPanel(root) {
  return Boolean(root?.querySelector?.(PANEL_SELECTOR));
}

function settingValue(key) {
  try {
    return globalThis.game?.settings?.get?.(MODULE_ID, key);
  } catch {
    return null;
  }
}

function compactResourceFingerprint(actor) {
  const hp = actor?.system?.attributes?.hp ?? {};
  const spells = actor?.system?.spells ?? {};
  const resources = actor?.system?.resources ?? {};
  const spellState = Object.entries(spells)
    .map(([key, slot]) => `${key}:${slot?.value ?? ""}/${slot?.max ?? ""}`)
    .join(",");
  const resourceState = Object.entries(resources)
    .map(([key, resource]) => `${key}:${resource?.value ?? ""}/${resource?.max ?? ""}`)
    .join(",");
  return [
    actor?.id ?? "",
    actor?._stats?.modifiedTime ?? "",
    `${hp.value ?? ""}/${hp.max ?? ""}/${hp.temp ?? ""}`,
    spellState,
    resourceState
  ].join("~");
}

export function combatPreviewFingerprint(combat) {
  const combatants = combat?.combatants?.contents ?? [...(combat?.combatants ?? [])];
  const settings = [
    settingValue("includeDefeatedCombatants"),
    settingValue("includeCurrentResources"),
    settingValue("allyContribution")
  ].join(":");
  const participants = combatants.map((combatant) => [
    combatant.id ?? "",
    combatant.isDefeated ? 1 : 0,
    combatant.tokenId ?? combatant.token?.id ?? "",
    compactResourceFingerprint(combatant.actor ?? combatant.token?.actor)
  ].join("#")).join("|");
  return `${combat?.id ?? ""};${combat?.round ?? ""};${combat?.turn ?? ""};${settings};${participants}`;
}

export function clearCombatPreviewCache() {
  previewCache = null;
}

export function analyseCombatPreview(api, combat) {
  const fingerprint = combatPreviewFingerprint(combat);
  if (previewCache?.fingerprint === fingerprint) return previewCache.promise;
  const promise = api.analyseCombat(combat, { remember: false, emitHooks: false, extensionModels: false })
    .catch((error) => {
      if (previewCache?.fingerprint === fingerprint) previewCache = null;
      throw error;
    });
  previewCache = { fingerprint, promise };
  return promise;
}

function createButton(className, html) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.innerHTML = html;
  return button;
}

export function registerCombatTrackerIntegration(api) {
  if (combatTrackerHookId !== null) return combatTrackerHookId;
  combatTrackerHookId = globalThis.Hooks.on("renderCombatTracker", (_app, html) => {
    try {
      if (!globalThis.game?.user?.isGM) return;
      if (!globalThis.game.settings.get(MODULE_ID, "showCombatTrackerBanner")) return;
      const root = rootElement(html);
      if (!root || hasCombatTrackerPanel(root)) return;

      const panel = document.createElement("section");
      panel.className = "runyth-encounter-crucible-tracker";
      panel.dataset.encounterCrucibleIntegration = "combat-tracker";

      const openButton = createButton(
        "runyth-encounter-crucible-tracker__button",
        `<i class="fa-solid fa-scale-balanced" aria-hidden="true"></i><span>${localize("EC.Tracker.Open")}</span>`
      );
      openButton.addEventListener("click", () => {
        void runActionOnce(openButton, "open", async () => {
          try {
            const encounter = globalThis.game.combat
              ? await api.analyseCombat(globalThis.game.combat)
              : null;
            api.openDashboard(encounter);
          } catch (error) {
            globalThis.ui?.notifications?.warn?.(error?.message ?? String(error));
            api.openWorkshop();
          }
        });
      });
      panel.append(openButton);

      const target = root.querySelector(".combat-tracker-header")?.parentElement ?? root;
      target.prepend(panel);

      const combat = globalThis.game.combat;
      if (!combat) return;
      void analyseCombatPreview(api, combat)
        .then((encounter) => {
          if (!panel.isConnected || !encounter?.assessment) return;
          const summary = createButton(
            "runyth-encounter-crucible-tracker__summary",
            `<strong>${encounter.assessment.classification}</strong><span>${encounter.assessment.volatility.id} ${localize("EC.Tracker.Volatility")}</span>`
          );
          summary.addEventListener("click", () => api.openDashboard(encounter));
          panel.append(summary);
        })
        .catch((error) => console.debug(`[${MODULE_ID}] Combat tracker preview unavailable.`, error));
    } catch (error) {
      console.error(`[${MODULE_ID}] Combat Tracker integration failed.`, error);
    }
  });
  return combatTrackerHookId;
}
