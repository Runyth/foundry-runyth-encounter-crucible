// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { API_VERSION, MODULE_ID, SCHEMA_VERSION, XP_BUDGET_2024 } from "./constants.js";
import { aggregateAssessment, xpForCr } from "./calculations.js";
import { clamp, deepClone, formatDate, slugify, sum } from "./utils.js";

export function resolveCompositionMode({ preferQuantity = false, preferStrength = false, fixedGroupSize = 0 } = {}) {
  if (Number(fixedGroupSize) > 0) return "fixed";
  if (preferQuantity && preferStrength) return "hybrid";
  if (preferQuantity) return "quantity";
  if (preferStrength) return "strength";
  return "neutral";
}

export function targetBudgetForDifficulty(party, target = "moderate") {
  const difficulty = ["low", "moderate", "high"].includes(target) ? target : target === "trivial" ? "low" : "high";
  const scale = target === "trivial" ? 0.45 : target === "extreme" ? 1.35 : 1;
  let budget = 0;
  for (const member of party) {
    const quantity = Math.max(1, Math.trunc(member.quantity ?? 1));
    const level = clamp(Math.trunc(member.level ?? 1), 1, 20);
    const contribution = clamp(member.contribution ?? 1, 0, 1.5);
    budget += XP_BUDGET_2024[level][difficulty] * contribution * quantity;
  }
  return Math.round(budget * scale);
}

function candidateXp(candidate) {
  return Math.max(0, Number(candidate.xp) || xpForCr(candidate.cr));
}

function rosterSignature(quantities) {
  return [...quantities.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, quantity]) => `${index}:${quantity}`)
    .join("|");
}

function scoreRosterState(state, targetXp, mode, desiredCount, partySize) {
  const distance = targetXp > 0 ? Math.abs(targetXp - state.xp) / targetXp : Math.abs(state.xp);
  const overshoot = targetXp > 0 && state.xp > targetXp ? (state.xp - targetXp) / targetXp : 0;
  const quantityPreference = state.count > 0 ? 1 / state.count : 1;
  const strengthPreference = targetXp > 0 ? 1 - Math.min(1, state.maxXp / targetXp) : 1;
  const fixedPenalty = desiredCount > 0 ? Math.abs(state.count - desiredCount) / desiredCount : 0;
  const partyBalancePenalty = partySize > 0 && state.count > partySize * 3 ? (state.count - partySize * 3) / partySize : 0;
  const diversityPenalty = state.distinct > 3 ? (state.distinct - 3) * 0.05 : 0;
  const modePenalty = mode === "quantity"
    ? quantityPreference * 0.3
    : mode === "strength"
      ? strengthPreference * 0.3
      : mode === "hybrid"
        ? (quantityPreference + strengthPreference) * 0.1
        : 0;
  return distance + (overshoot * 0.55) + fixedPenalty + partyBalancePenalty + diversityPenalty + modePenalty;
}

function prepareGeneration(input) {
  const {
    party = [],
    candidates = [],
    target = "moderate",
    preferQuantity = false,
    preferStrength = false,
    fixedGroupSize = 0,
    minimumCount = 1,
    maximumCount = 12,
    allowDuplicates = true,
    boss = false,
    includeMinions = false,
    conditions = {},
    theme = "Generated",
    name = "Generated Encounter"
  } = input ?? {};
  const valid = candidates
    .map((candidate, originalIndex) => ({
      source: candidate,
      originalIndex,
      id: candidate.id ?? `candidate-${originalIndex}`,
      name: candidate.name ?? "Unnamed Actor",
      xp: candidateXp(candidate)
    }))
    .filter((candidate) => candidate.xp > 0)
    .sort((left, right) => left.xp - right.xp || left.name.localeCompare(right.name) || left.originalIndex - right.originalIndex);
  if (!party.length) throw new Error("Encounter generation requires at least one party member.");
  if (!valid.length) throw new Error("Encounter generation requires at least one candidate with CR or XP data.");

  const mode = resolveCompositionMode({ preferQuantity, preferStrength, fixedGroupSize });
  const targetXp = targetBudgetForDifficulty(party, target);
  const partySize = sum(party.map((member) => Math.max(1, Math.trunc(member.quantity ?? 1))));
  const desiredCount = mode === "fixed" ? Math.max(1, Math.trunc(fixedGroupSize)) : 0;
  const minCount = desiredCount || Math.max(1, Math.trunc(minimumCount));
  const maxCount = desiredCount || Math.max(minCount, Math.trunc(maximumCount));
  return {
    party,
    valid,
    target,
    targetXp,
    partySize,
    mode,
    desiredCount,
    minCount,
    maxCount,
    allowDuplicates,
    boss,
    includeMinions,
    conditions,
    theme,
    name
  };
}


function compareGenerationStates(left, right) {
  return left.score - right.score || left.count - right.count || left.xp - right.xp || left.sequence - right.sequence;
}

function pushBestState(heap, state, limit) {
  const isWorse = (left, right) => compareGenerationStates(left, right) > 0;
  if (heap.length < limit) {
    heap.push(state);
    let index = heap.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!isWorse(heap[index], heap[parent])) break;
      [heap[index], heap[parent]] = [heap[parent], heap[index]];
      index = parent;
    }
    return;
  }
  if (compareGenerationStates(state, heap[0]) >= 0) return;
  heap[0] = state;
  let index = 0;
  while (true) {
    const left = (index * 2) + 1;
    const right = left + 1;
    let worst = index;
    if (left < heap.length && isWorse(heap[left], heap[worst])) worst = left;
    if (right < heap.length && isWorse(heap[right], heap[worst])) worst = right;
    if (worst === index) break;
    [heap[index], heap[worst]] = [heap[worst], heap[index]];
    index = worst;
  }
}

function materializeEntries(state, valid) {
  return [...state.quantities.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, quantity]) => ({
      ...deepClone(valid[index].source),
      id: valid[index].id,
      quantity,
      side: "enemy",
      xp: valid[index].xp
    }));
}


function finalizeGeneration(prepared, explored) {
  const {
    party,
    valid,
    target,
    targetXp,
    mode,
    desiredCount,
    minCount,
    maxCount,
    allowDuplicates,
    boss,
    includeMinions,
    conditions,
    theme,
    name
  } = prepared;
  let eligible = explored.filter((state) => state.count >= minCount && state.count <= maxCount);
  if (boss) {
    const bossXp = Math.max(...valid.map((candidate) => candidate.xp));
    eligible = eligible.filter((state) => state.maxXp === bossXp);
  }
  if (includeMinions && eligible.some((state) => state.distinct > 1)) {
    eligible = eligible.filter((state) => state.distinct > 1);
  }
  const selected = (eligible.length ? eligible : explored).sort(compareGenerationStates)[0];
  if (!selected) throw new Error("No encounter roster could be generated from the supplied constraints.");
  const encounter = createEncounterDefinition({
    name,
    theme,
    party,
    enemies: materializeEntries(selected, valid),
    conditions,
    generation: {
      target,
      targetXp,
      actualXp: selected.xp,
      compositionMode: mode,
      fixedGroupSize: desiredCount || null,
      minimumCount: minCount,
      maximumCount: maxCount,
      allowDuplicates,
      boss,
      includeMinions
    }
  });
  encounter.assessment = aggregateAssessment(encounter);
  return encounter;
}

function createGenerationState() {
  return { quantities: new Map(), count: 0, xp: 0, distinct: 0, maxXp: 0, score: Number.POSITIVE_INFINITY, sequence: 0 };
}

function expandGenerationState(state, candidateIndex, prepared, seen, sequence) {
  const candidate = prepared.valid[candidateIndex];
  const currentQuantity = state.quantities.get(candidateIndex) ?? 0;
  if (currentQuantity > 0 && !prepared.allowDuplicates) return null;
  const quantities = new Map(state.quantities);
  quantities.set(candidateIndex, currentQuantity + 1);
  const signature = rosterSignature(quantities);
  if (seen.has(signature)) return null;
  seen.add(signature);
  const nextState = {
    quantities,
    count: state.count + 1,
    xp: state.xp + candidate.xp,
    distinct: state.distinct + (currentQuantity === 0 ? 1 : 0),
    maxXp: Math.max(state.maxXp, candidate.xp),
    sequence
  };
  nextState.score = scoreRosterState(nextState, prepared.targetXp, prepared.mode, prepared.desiredCount, prepared.partySize);
  return nextState;
}

export function generateEncounter(input = {}, runtime = {}) {
  const prepared = prepareGeneration(input);
  const beamWidth = 80;
  let beam = [createGenerationState()];
  const explored = [];
  const seen = new Set();
  let sequence = 0;

  for (let depth = 0; depth < prepared.maxCount; depth += 1) {
    const next = [];
    for (const state of beam) {
      for (let candidateIndex = 0; candidateIndex < prepared.valid.length; candidateIndex += 1) {
        const nextState = expandGenerationState(state, candidateIndex, prepared, seen, ++sequence);
        if (nextState) pushBestState(next, nextState, beamWidth);
      }
    }
    beam = next.sort(compareGenerationStates);
    explored.push(...beam);
    runtime.onProgress?.({
      depth: depth + 1,
      maximumDepth: prepared.maxCount,
      explored: explored.length,
      activeStates: beam.length,
      bestScore: Number.isFinite(beam[0]?.score) ? beam[0].score : null
    });
    if (!beam.length) break;
  }
  return finalizeGeneration(prepared, explored);
}

export async function generateEncounterCooperatively(input = {}, runtime = {}) {
  const prepared = prepareGeneration(input);
  const beamWidth = 80;
  const yieldEvery = Math.max(64, Math.trunc(runtime.yieldEvery ?? 512));
  const yieldControl = runtime.yieldControl ?? (() => Promise.resolve());
  let beam = [createGenerationState()];
  const explored = [];
  const seen = new Set();
  let sequence = 0;
  let operations = 0;

  for (let depth = 0; depth < prepared.maxCount; depth += 1) {
    const next = [];
    for (const state of beam) {
      for (let candidateIndex = 0; candidateIndex < prepared.valid.length; candidateIndex += 1) {
        if (runtime.signal?.aborted) throw runtime.abortError?.() ?? new Error("Encounter generation was cancelled.");
        const nextState = expandGenerationState(state, candidateIndex, prepared, seen, ++sequence);
        if (nextState) pushBestState(next, nextState, beamWidth);
        operations += 1;
        if (operations % yieldEvery === 0) await yieldControl();
      }
    }
    beam = next.sort(compareGenerationStates);
    explored.push(...beam);
    runtime.onProgress?.({
      depth: depth + 1,
      maximumDepth: prepared.maxCount,
      explored: explored.length,
      activeStates: beam.length,
      bestScore: Number.isFinite(beam[0]?.score) ? beam[0].score : null
    });
    await yieldControl();
    if (!beam.length) break;
  }
  if (runtime.signal?.aborted) throw runtime.abortError?.() ?? new Error("Encounter generation was cancelled.");
  return finalizeGeneration(prepared, explored);
}

export function createEncounterDefinition({
  id,
  name = "Encounter",
  theme = "General",
  description = "",
  party = [],
  enemies = [],
  allies = [],
  neutral = [],
  conditions = {},
  generation = null,
  sceneUuid = null,
  combatUuid = null,
  journalUuid = null
} = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    apiVersion: API_VERSION,
    moduleId: MODULE_ID,
    id: id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    slug: slugify(name),
    theme,
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    party: deepClone(party),
    enemies: deepClone(enemies),
    allies: deepClone(allies),
    neutral: deepClone(neutral),
    conditions: deepClone(conditions),
    generation: deepClone(generation),
    sceneUuid,
    combatUuid,
    journalUuid,
    assessment: null
  };
}

export function formatEncounterName(format, encounter, date = new Date()) {
  const party = encounter.party ?? [];
  const quantities = party.map((member) => Math.max(1, Math.trunc(member.quantity ?? 1)));
  const weightedLevel = sum(party.map((member, index) => (Number(member.level) || 0) * quantities[index]));
  const partyCount = sum(quantities);
  const averageLevel = partyCount ? Math.round((weightedLevel / partyCount) * 10) / 10 : 0;
  const replacements = {
    date: formatDate(date),
    name: encounter.name ?? "Encounter",
    theme: encounter.theme ?? "General",
    difficulty: encounter.assessment?.classification ?? "unassessed",
    volatility: encounter.assessment?.volatility?.id ?? "unknown",
    partyLevel: String(averageLevel),
    partySize: String(partyCount)
  };
  return String(format || "{date} - {theme} - {name}").replace(/\{([A-Za-z]+)\}/g, (match, key) => replacements[key] ?? match);
}
