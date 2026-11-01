// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { xpForCr } from "../core/calculations.js";
import { asFiniteNumber, clamp, parseFraction } from "../core/utils.js";

function getProperty(object, path, fallback = undefined) {
  return path.split(".").reduce((value, key) => value?.[key], object) ?? fallback;
}

function collectionValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return [...value.values()];
  if (typeof value.values === "function") return [...value.values()];
  if (typeof value === "object") return Object.values(value);
  return [];
}

function activityValues(item) {
  return collectionValues(item?.system?.activities);
}

function activationType(activity, item) {
  return String(
    activity?.activation?.type
    ?? activity?.activation?.value
    ?? item?.system?.activation?.type
    ?? ""
  ).toLowerCase();
}

function countActionTypes(actor) {
  const items = collectionValues(actor?.items);
  let bonusActions = 0;
  let reactions = 0;
  let legendaryActions = 0;
  let lairActions = 0;
  for (const item of items) {
    const activities = activityValues(item);
    const sources = activities.length ? activities : [item];
    for (const source of sources) {
      const type = activationType(source, item);
      if (type.includes("bonus")) bonusActions = 1;
      else if (type.includes("reaction")) reactions = 1;
      else if (type.includes("legendary")) legendaryActions += 1;
      else if (type.includes("lair")) lairActions = 1;
    }
  }
  const legact = getProperty(actor, "system.resources.legact.max", getProperty(actor, "system.resources.legact.value", 0));
  if (asFiniteNumber(legact, 0) > legendaryActions) legendaryActions = asFiniteNumber(legact, 0);
  return { actions: 1, bonusActions, reactions, legendaryActions, lairActions };
}

function calculateSpellRatio(actor) {
  const spells = getProperty(actor, "system.spells", {});
  let weightedMax = 0;
  let weightedValue = 0;
  for (const [key, slot] of Object.entries(spells)) {
    const maximum = asFiniteNumber(slot?.max, 0);
    if (maximum <= 0) continue;
    const explicit = asFiniteNumber(slot?.level, 0);
    const match = explicit > 0 ? null : String(key).match(/^spell(\d+)$/i);
    const level = explicit > 0 ? explicit : match ? Math.max(1, Number(match[1])) : 1;
    weightedMax += maximum * level;
    weightedValue += asFiniteNumber(slot?.value, 0) * level;
  }
  return weightedMax > 0 ? clamp(weightedValue / weightedMax, 0, 1) : 1;
}

function calculateResourceRatio(actor) {
  let total = 0;
  let count = 0;
  for (const resource of Object.values(getProperty(actor, "system.resources", {}))) {
    const maximum = asFiniteNumber(resource?.max, 0);
    if (maximum <= 0) continue;
    total += clamp(asFiniteNumber(resource.value, 0) / maximum, 0, 1);
    count += 1;
  }
  for (const item of collectionValues(actor?.items)) {
    const uses = item?.system?.uses;
    const maximum = asFiniteNumber(uses?.max, 0);
    if (maximum <= 0) continue;
    total += clamp(asFiniteNumber(uses.value, 0) / maximum, 0, 1);
    count += 1;
  }
  return count ? total / count : 1;
}

export function normalizeActor(actor, options = {}) {
  if (!actor) throw new Error("Cannot normalize an empty Actor reference.");
  const system = actor.system ?? {};
  const type = String(actor.type ?? "unknown");
  const level = type === "character" || type === "group"
    ? asFiniteNumber(getProperty(system, "details.level", getProperty(system, "attributes.level", 0)), 0)
    : undefined;
  const cr = type === "npc"
    ? parseFraction(getProperty(system, "details.cr", 0), 0)
    : undefined;
  const xp = asFiniteNumber(getProperty(system, "details.xp.value", 0), 0) || xpForCr(cr);
  const hpValue = asFiniteNumber(getProperty(system, "attributes.hp.value", 0), 0);
  const hpMax = asFiniteNumber(getProperty(system, "attributes.hp.max", hpValue), hpValue);
  const actionData = countActionTypes(actor);
  return {
    id: actor.id ?? null,
    actorUuid: actor.uuid ?? (actor.id ? `Actor.${actor.id}` : null),
    tokenUuid: options.tokenUuid ?? null,
    name: actor.name ?? "Unnamed Actor",
    type,
    side: options.side ?? "neutral",
    quantity: Math.max(1, Math.trunc(options.quantity ?? 1)),
    contribution: clamp(options.contribution ?? 1, 0, 1.5),
    level: level > 0 ? level : undefined,
    cr: Number.isFinite(cr) ? cr : undefined,
    xp: xp > 0 ? xp : 0,
    hp: {
      value: hpValue,
      max: hpMax,
      temporary: asFiniteNumber(getProperty(system, "attributes.hp.temp", 0), 0)
    },
    ac: asFiniteNumber(getProperty(system, "attributes.ac.value", 0), 0),
    spellRatio: calculateSpellRatio(actor),
    resourceRatio: calculateResourceRatio(actor),
    ...actionData,
    source: {
      systemId: globalThis.game?.system?.id ?? null,
      systemVersion: globalThis.game?.system?.version ?? null,
      actorType: type
    }
  };
}

export async function normalizeUuid(uuid, options = {}) {
  const document = await globalThis.fromUuid(uuid);
  const actor = document?.actor ?? (document?.documentName === "Actor" ? document : null);
  if (!actor) throw new Error(`UUID '${uuid}' does not resolve to an Actor or Token.`);
  return normalizeActor(actor, {
    ...options,
    tokenUuid: document?.documentName === "Token" || document?.documentName === "TokenDocument" ? document.uuid : options.tokenUuid
  });
}

export function classifyToken(tokenDocument) {
  const actor = tokenDocument?.actor;
  const dispositions = globalThis.CONST?.TOKEN_DISPOSITIONS ?? { FRIENDLY: 1, NEUTRAL: 0, HOSTILE: -1 };
  const disposition = tokenDocument?.disposition ?? tokenDocument?.document?.disposition ?? 0;
  if (actor?.type === "character" || actor?.hasPlayerOwner) return "party";
  if (disposition === dispositions.HOSTILE) return "enemy";
  if (disposition === dispositions.FRIENDLY) return "ally";
  return "neutral";
}

export function normalizeToken(tokenDocument, overrides = {}) {
  const side = overrides.side ?? classifyToken(tokenDocument);
  const contribution = overrides.contribution ?? (side === "ally" ? 0.5 : side === "neutral" ? 0 : 1);
  return normalizeActor(tokenDocument.actor, {
    side,
    contribution,
    tokenUuid: tokenDocument.uuid,
    quantity: 1
  });
}
