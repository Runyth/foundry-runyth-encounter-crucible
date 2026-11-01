// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { createEncounterDefinition } from "../core/encounter.js";
import { normalizeToken } from "./actor-normalizer.js";

function normalizeCombatToken(token, overrides = {}) {
  const normalized = normalizeToken(token, overrides);
  if (normalized.side !== "ally" || overrides.contribution !== undefined) return normalized;
  const configured = globalThis.game?.settings?.get?.("runyth-encounter-crucible", "allyContribution");
  return {
    ...normalized,
    contribution: Number.isFinite(configured) ? configured : normalized.contribution
  };
}

function combatantsOf(combat) {
  return combat?.combatants?.contents ?? [...(combat?.combatants ?? [])];
}

export function encounterFromCombat(combat, options = {}) {
  if (!combat) throw new Error("No Combat encounter is active.");
  const participants = combatantsOf(combat)
    .filter((combatant) => options.includeDefeated || !combatant.isDefeated)
    .map((combatant) => {
      const token = combatant.token;
      if (!token?.actor) return null;
      return normalizeCombatToken(token, options.overrides?.[combatant.id] ?? {});
    })
    .filter(Boolean);
  const encounter = createEncounterDefinition({
    name: combat.name ?? `Combat ${combat.id}`,
    theme: options.theme ?? "Active Combat",
    party: participants.filter((entry) => entry.side === "party"),
    enemies: participants.filter((entry) => entry.side === "enemy"),
    allies: participants.filter((entry) => entry.side === "ally"),
    neutral: participants.filter((entry) => entry.side === "neutral"),
    conditions: options.conditions ?? {},
    sceneUuid: combat.scene?.uuid ?? (combat.scene ? `Scene.${combat.scene.id}` : null),
    combatUuid: combat.uuid
  });
  return encounter;
}

export function encounterFromTokens(tokens, options = {}) {
  const participants = tokens.map((token) => normalizeCombatToken(token.document ?? token, options.overrides?.[(token.document ?? token).id] ?? {}));
  const encounter = createEncounterDefinition({
    name: options.name ?? "Selected Tokens",
    theme: options.theme ?? "Scene Selection",
    party: participants.filter((entry) => entry.side === "party"),
    enemies: participants.filter((entry) => entry.side === "enemy"),
    allies: participants.filter((entry) => entry.side === "ally"),
    neutral: participants.filter((entry) => entry.side === "neutral"),
    conditions: options.conditions ?? {},
    sceneUuid: globalThis.canvas?.scene?.uuid ?? null
  });
  return encounter;
}
