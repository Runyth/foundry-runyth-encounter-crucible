// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../core/constants.js";
import { invalidateActorCandidateCache, invalidateActorFolderCache } from "../services/folder-service.js";

let registered = false;
let refreshQueued = false;

function collectionValues(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values === "function") return [...collection.values()];
  return [];
}

export function encounterReferencesActor(encounter, actor) {
  if (!encounter || !actor) return false;
  const actorIds = new Set([actor.id, actor.uuid].filter(Boolean));
  return ["party", "enemies", "allies", "neutral"].some((side) =>
    (encounter[side] ?? []).some((entry) => actorIds.has(entry.id) || actorIds.has(entry.actorUuid))
  );
}

export function activeCombatReferencesActor(actor, combat = globalThis.game?.combat) {
  if (!actor || !combat) return false;
  return collectionValues(combat.combatants).some((combatant) => {
    const combatantActor = combatant.actor ?? combatant.token?.actor;
    return combatantActor?.id === actor.id || combatantActor?.uuid === actor.uuid;
  });
}

function belongsToActiveCombat(document, combat = globalThis.game?.combat) {
  if (!combat || !document) return false;
  const parent = document.parent ?? document.combat;
  return parent?.id === combat.id || document.id === combat.id;
}

function queueRefresh(invalidateOpenWindows) {
  if (refreshQueued) return;
  refreshQueued = true;
  const schedule = typeof globalThis.requestAnimationFrame === "function"
    ? globalThis.requestAnimationFrame.bind(globalThis)
    : (callback) => globalThis.setTimeout(callback, 0);
  schedule(() => {
    refreshQueued = false;
    try {
      globalThis.ui?.combat?.render?.();
      invalidateOpenWindows();
    } catch (error) {
      console.error(`[${MODULE_ID}] UI refresh failed.`, error);
    }
  });
}

export function registerRuntimeRefreshHooks({ invalidateOpenWindows, getOpenEncounters }) {
  if (registered) return false;
  registered = true;

  const onCombatDocument = (document) => {
    if (belongsToActiveCombat(document)) queueRefresh(invalidateOpenWindows);
  };
  for (const hook of ["createCombatant", "deleteCombatant", "updateCombatant", "updateCombat"]) {
    globalThis.Hooks.on(hook, onCombatDocument);
  }

  globalThis.Hooks.on("updateActor", (actor) => {
    invalidateActorCandidateCache(actor);
    const relevant = activeCombatReferencesActor(actor)
      || getOpenEncounters().some((encounter) => encounterReferencesActor(encounter, actor));
    if (relevant) queueRefresh(invalidateOpenWindows);
  });
  globalThis.Hooks.on("createActor", () => invalidateActorCandidateCache());
  globalThis.Hooks.on("deleteActor", () => invalidateActorCandidateCache());
  for (const hook of ["createFolder", "updateFolder", "deleteFolder"]) {
    globalThis.Hooks.on(hook, (folder) => {
      if (folder?.type === "Actor") invalidateActorFolderCache();
    });
  }

  globalThis.Hooks.on("canvasReady", () => queueRefresh(invalidateOpenWindows));
  return true;
}
