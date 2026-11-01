// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
function gridSize(scene) {
  return Number(scene?.grid?.size ?? globalThis.canvas?.grid?.size ?? 100) || 100;
}

function spiralPositions(count, origin, step) {
  const positions = [];
  let x = 0;
  let y = 0;
  let dx = 0;
  let dy = -1;
  const radius = Math.max(3, Math.ceil(Math.sqrt(count)) + 1);
  for (let i = 0; positions.length < count && i < (radius * 2 + 1) ** 2; i += 1) {
    if (Math.abs(x) <= radius && Math.abs(y) <= radius) {
      positions.push({ x: origin.x + (x * step), y: origin.y + (y * step) });
    }
    if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
      [dx, dy] = [-dy, dx];
    }
    x += dx;
    y += dy;
  }
  return positions;
}

export async function placeEncounter(encounter, options = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can place encounter Tokens.");
  const scene = options.scene ?? globalThis.canvas?.scene;
  if (!scene) throw new Error("No Scene is active.");
  const entries = [
    ...(encounter.enemies ?? []).map((entry) => ({ ...entry, disposition: -1 })),
    ...(encounter.allies ?? []).map((entry) => ({ ...entry, disposition: 1 })),
    ...(encounter.neutral ?? []).map((entry) => ({ ...entry, disposition: 0 }))
  ].flatMap((entry) => Array.from({ length: Math.max(1, Math.trunc(entry.quantity ?? 1)) }, () => entry));
  if (!entries.length) throw new Error("The encounter has no placeable enemies, allies, or neutral participants.");
  const origin = options.origin ?? {
    x: Math.max(0, Number(globalThis.canvas?.stage?.pivot?.x ?? 0)),
    y: Math.max(0, Number(globalThis.canvas?.stage?.pivot?.y ?? 0))
  };
  const positions = spiralPositions(entries.length, origin, gridSize(scene));
  const tokenData = (await Promise.all(entries.map(async (entry, index) => {
    if (!entry.actorUuid) return null;
    const actorDocument = await globalThis.fromUuid(entry.actorUuid);
    const actor = actorDocument?.actor ?? actorDocument;
    if (!actor?.getTokenDocument) return null;
    const token = await actor.getTokenDocument({
      x: positions[index]?.x ?? origin.x,
      y: positions[index]?.y ?? origin.y,
      disposition: entry.disposition,
      hidden: Boolean(options.hiddenEnemies && entry.disposition < 0)
    });
    return token.toObject ? token.toObject() : token;
  }))).filter(Boolean);
  if (!tokenData.length) throw new Error("None of the encounter participants reference a placeable Actor.");
  const created = await scene.createEmbeddedDocuments("Token", tokenData);
  encounter.sceneUuid = scene.uuid;
  encounter.placedTokenUuids = created.map((token) => token.uuid);
  return created;
}

export async function createCombatFromTokens(tokens, options = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can create Combat encounters.");
  const scene = options.scene ?? globalThis.canvas?.scene;
  if (!scene) throw new Error("No Scene is active.");
  if (!tokens?.length) throw new Error("At least one placed Token is required to create a Combat encounter.");
  const Combat = globalThis.foundry?.documents?.Combat;
  if (!Combat) throw new Error("Foundry Combat API is unavailable.");
  let combat = null;
  try {
    combat = await Combat.create({
      name: options.name ?? "Runyth Encounter Crucible Combat",
      scene: scene.id,
      active: false
    });
    const combatants = tokens.map((token) => ({
      tokenId: token.id,
      sceneId: scene.id,
      actorId: token.actorId ?? token.actor?.id,
      hidden: Boolean(token.hidden)
    }));
    await combat.createEmbeddedDocuments("Combatant", combatants);
    if (options.activate !== false) await combat.activate();
    return combat;
  } catch (error) {
    if (combat?.id) {
      try {
        await combat.delete();
      } catch (rollbackError) {
        console.error("[runyth-encounter-crucible] Could not roll back a partially created Combat.", rollbackError);
      }
    }
    throw error;
  }
}

export async function placeAndCreateCombat(encounter, options = {}) {
  const tokens = await placeEncounter(encounter, options);
  try {
    const combat = await createCombatFromTokens(tokens, { ...options, name: encounter.name });
    encounter.combatUuid = combat.uuid;
    return { tokens, combat };
  } catch (error) {
    if (options.rollbackOnFailure !== false) {
      const scene = options.scene ?? globalThis.canvas?.scene;
      const tokenIds = tokens.map((token) => token.id).filter(Boolean);
      if (scene && tokenIds.length) {
        try {
          await scene.deleteEmbeddedDocuments("Token", tokenIds);
          encounter.placedTokenUuids = [];
        } catch (rollbackError) {
          console.error("[runyth-encounter-crucible] Could not roll back Tokens after Combat creation failed.", rollbackError);
        }
      }
    }
    throw error;
  }
}
