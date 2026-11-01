// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import {
  CR_XP,
  DEFAULT_MODEL_WEIGHTS,
  DIFFICULTY_SCORES,
  MULTIPLIER_STEPS_2014,
  SCORE_BANDS,
  TACTICAL_MODIFIERS,
  XP_BUDGET_2024,
  XP_THRESHOLDS_2014
} from "./constants.js";
import { average, clamp, deepClone, round, sum, weightedAverage } from "./utils.js";

function snapshotAssessmentContext(context = {}) {
  return deepClone({
    id: context.id ?? null,
    name: context.name ?? "Encounter",
    theme: context.theme ?? "General",
    party: context.party ?? [],
    enemies: context.enemies ?? [],
    allies: context.allies ?? [],
    neutral: context.neutral ?? [],
    conditions: context.conditions ?? {},
    generation: context.generation ?? null,
    sceneUuid: context.sceneUuid ?? null,
    combatUuid: context.combatUuid ?? null,
    journalUuid: context.journalUuid ?? null
  });
}

function participantCopies(participants = []) {
  return participants.flatMap((participant) => {
    const quantity = Math.max(1, Math.trunc(participant.quantity ?? 1));
    return Array.from({ length: quantity }, () => participant);
  });
}

export function xpForCr(cr) {
  const key = String(Number(cr));
  return CR_XP[key] ?? 0;
}

export function calculate2024Budget(party = [], enemies = []) {
  const partyCopies = participantCopies(party);
  const members = partyCopies.filter((member) => Number.isFinite(member.level) && member.level >= 1);
  const budgets = { low: 0, moderate: 0, high: 0 };
  for (const member of members) {
    const row = XP_BUDGET_2024[clamp(Math.trunc(member.level), 1, 20)];
    const contribution = clamp(member.contribution ?? 1, 0, 1.5);
    budgets.low += row.low * contribution;
    budgets.moderate += row.moderate * contribution;
    budgets.high += row.high * contribution;
  }
  const enemyXp = sum(participantCopies(enemies).map((enemy) => enemy.xp || xpForCr(enemy.cr)));
  let classification = "trivial";
  if (enemyXp > 0 && enemyXp <= budgets.low) classification = "low";
  else if (enemyXp <= budgets.moderate) classification = "moderate";
  else if (enemyXp <= budgets.high) classification = "high";
  else if (enemyXp > budgets.high) classification = "extreme";
  return {
    id: "rules2024",
    classification,
    score: DIFFICULTY_SCORES[classification] ?? 0,
    confidence: partyCopies.length === 0 ? 0 : members.length === partyCopies.length ? 1 : 0.65,
    metrics: {
      partySize: members.length,
      enemyXp,
      lowBudget: Math.round(budgets.low),
      moderateBudget: Math.round(budgets.moderate),
      highBudget: Math.round(budgets.high),
      moderateUtilization: budgets.moderate > 0 ? round(enemyXp / budgets.moderate, 3) : 0,
      highUtilization: budgets.high > 0 ? round(enemyXp / budgets.high, 3) : 0
    },
    warnings: members.length ? [] : ["missing-party-levels"]
  };
}

export function multiplier2014(enemyCount, partySize) {
  if (enemyCount <= 0) return 1;
  const baseIndex = MULTIPLIER_STEPS_2014.findIndex((step) => enemyCount <= step.maximum);
  const adjustment = partySize < 3 ? 1 : partySize >= 6 ? -1 : 0;
  const index = clamp(baseIndex + adjustment, 0, MULTIPLIER_STEPS_2014.length - 1);
  return MULTIPLIER_STEPS_2014[index].multiplier;
}

export function calculate2014Thresholds(party = [], enemies = []) {
  const partyCopies = participantCopies(party);
  const members = partyCopies.filter((member) => Number.isFinite(member.level) && member.level >= 1);
  const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  for (const member of members) {
    const row = XP_THRESHOLDS_2014[clamp(Math.trunc(member.level), 1, 20)];
    const contribution = clamp(member.contribution ?? 1, 0, 1.5);
    thresholds.easy += row.easy * contribution;
    thresholds.medium += row.medium * contribution;
    thresholds.hard += row.hard * contribution;
    thresholds.deadly += row.deadly * contribution;
  }
  const copies = participantCopies(enemies);
  const rawXp = sum(copies.map((enemy) => enemy.xp || xpForCr(enemy.cr)));
  const multiplier = multiplier2014(copies.length, members.length);
  const adjustedXp = rawXp * multiplier;
  let classification = "trivial";
  if (adjustedXp > 0 && adjustedXp < thresholds.easy) classification = "trivial";
  else if (adjustedXp < thresholds.medium) classification = "easy";
  else if (adjustedXp < thresholds.hard) classification = "medium";
  else if (adjustedXp < thresholds.deadly) classification = "hard";
  else if (adjustedXp >= thresholds.deadly) classification = "deadly";
  return {
    id: "rules2014",
    classification,
    score: DIFFICULTY_SCORES[classification] ?? 0,
    confidence: partyCopies.length === 0 ? 0 : members.length === partyCopies.length ? 1 : 0.65,
    metrics: {
      partySize: members.length,
      enemyCount: copies.length,
      rawXp,
      multiplier,
      adjustedXp: Math.round(adjustedXp),
      easyThreshold: Math.round(thresholds.easy),
      mediumThreshold: Math.round(thresholds.medium),
      hardThreshold: Math.round(thresholds.hard),
      deadlyThreshold: Math.round(thresholds.deadly)
    },
    warnings: members.length ? [] : ["missing-party-levels"]
  };
}

export function calculateCrRatio(party = [], enemies = []) {
  const partyCopies = participantCopies(party);
  const enemyCopies = participantCopies(enemies);
  const partyLevels = partyCopies.map((member) => member.level).filter(Number.isFinite);
  const enemyCrs = enemyCopies.map((enemy) => enemy.cr).filter(Number.isFinite);
  const averageLevel = average(partyLevels, 0);
  const maximumCr = enemyCrs.length ? Math.max(...enemyCrs) : 0;
  const averageCr = average(enemyCrs, 0);
  const bossRatio = averageLevel > 0 ? maximumCr / averageLevel : 0;
  const countRatio = partyCopies.length > 0 ? enemyCopies.length / partyCopies.length : 0;
  const pressure = Math.max(bossRatio, countRatio / 1.5, averageLevel > 0 ? averageCr / averageLevel : 0);
  const score = pressure < 0.5 ? 0 : pressure < 0.9 ? 1 : pressure < 1.25 ? 2 : pressure < 1.75 ? 3 : 4;
  const classification = SCORE_BANDS.find((band) => score <= band.maximum)?.id ?? "extreme";
  return {
    id: "crRatio",
    classification,
    score,
    confidence: partyLevels.length && enemyCrs.length ? 0.8 : 0.35,
    metrics: {
      averagePartyLevel: round(averageLevel, 2),
      maximumEnemyCr: round(maximumCr, 3),
      averageEnemyCr: round(averageCr, 3),
      bossRatio: round(bossRatio, 3),
      enemiesPerCharacter: round(countRatio, 3)
    },
    warnings: enemyCrs.length ? [] : ["missing-enemy-cr"]
  };
}

export function effectiveActions(participants = []) {
  return sum(participantCopies(participants).map((participant) => {
    const actions = Number.isFinite(participant.actions) ? participant.actions : 1;
    const bonusActions = Number.isFinite(participant.bonusActions) ? participant.bonusActions : 0;
    const reactions = Number.isFinite(participant.reactions) ? participant.reactions : 0;
    const legendaryActions = Number.isFinite(participant.legendaryActions) ? participant.legendaryActions : 0;
    const lairActions = Number.isFinite(participant.lairActions) ? participant.lairActions : 0;
    const contribution = clamp(participant.contribution ?? 1, 0, 1.5);
    return contribution * (
      actions
      + (bonusActions * 0.4)
      + (reactions * 0.25)
      + (legendaryActions * 0.7)
      + (lairActions * 0.8)
    );
  }));
}

export function calculateActionEconomy(party = [], enemies = []) {
  const partyActions = effectiveActions(party);
  const enemyActions = effectiveActions(enemies);
  const ratio = partyActions > 0 ? enemyActions / partyActions : enemyActions > 0 ? 4 : 0;
  const score = ratio < 0.45 ? 0 : ratio < 0.8 ? 1 : ratio < 1.15 ? 2 : ratio < 1.6 ? 3 : 4;
  return {
    id: "actionEconomy",
    classification: SCORE_BANDS.find((band) => score <= band.maximum)?.id ?? "extreme",
    score,
    confidence: partyActions > 0 && enemyActions > 0 ? 0.8 : 0.35,
    metrics: {
      partyEffectiveActions: round(partyActions, 2),
      enemyEffectiveActions: round(enemyActions, 2),
      enemyToPartyRatio: round(ratio, 3),
      enemyAdvantagePercent: round((ratio - 1) * 100, 1)
    },
    warnings: ratio > 1.5 ? ["enemy-action-economy"] : []
  };
}

export function calculateResourcePressure(party = []) {
  const copies = participantCopies(party);
  const hpRatios = copies.map((member) => member.hp?.max > 0 ? clamp(member.hp.value / member.hp.max, 0, 1) : null).filter(Number.isFinite);
  const spellRatios = copies.map((member) => Number.isFinite(member.spellRatio) ? clamp(member.spellRatio, 0, 1) : null).filter(Number.isFinite);
  const resourceRatios = copies.map((member) => Number.isFinite(member.resourceRatio) ? clamp(member.resourceRatio, 0, 1) : null).filter(Number.isFinite);
  const hp = average(hpRatios, 1);
  const spells = average(spellRatios, 1);
  const resources = average(resourceRatios, 1);
  const strength = weightedAverage([
    { value: hp, weight: 0.5 },
    { value: spells, weight: 0.35 },
    { value: resources, weight: 0.15 }
  ], 1);
  const penalty = strength >= 0.85 ? 0 : strength >= 0.7 ? 0.5 : strength >= 0.5 ? 1 : strength >= 0.3 ? 1.5 : 2;
  return {
    id: "resources",
    classification: penalty === 0 ? "manageable" : penalty <= 0.5 ? "challenging" : penalty <= 1 ? "dangerous" : "extreme",
    score: penalty,
    confidence: copies.length ? clamp((hpRatios.length + spellRatios.length + resourceRatios.length) / (copies.length * 3), 0.35, 1) : 0,
    metrics: {
      hpRemaining: round(hp, 3),
      spellCapacityRemaining: round(spells, 3),
      limitedResourcesRemaining: round(resources, 3),
      effectivePartyStrength: round(strength, 3),
      severityAdjustment: penalty
    },
    warnings: strength < 0.7 ? ["party-depleted"] : []
  };
}

export function calculateTacticalContext(conditions = {}) {
  const factors = Object.entries(TACTICAL_MODIFIERS)
    .filter(([key]) => Boolean(conditions[key]))
    .map(([key, value]) => ({ key, value }));
  const adjustment = clamp(sum(factors.map((factor) => factor.value)), -2, 2);
  return {
    id: "tactical",
    classification: adjustment <= -0.75 ? "manageable" : adjustment < 0.5 ? "challenging" : adjustment < 1.25 ? "dangerous" : "extreme",
    score: adjustment,
    confidence: 1,
    metrics: { severityAdjustment: round(adjustment, 2), factorCount: factors.length },
    factors,
    warnings: adjustment >= 1 ? ["severe-tactical-disadvantage"] : []
  };
}

export function calculateVolatility(context, models) {
  const partyCount = participantCopies(context.party).length;
  const enemyCount = participantCopies(context.enemies).length;
  const averageLevel = average(participantCopies(context.party).map((entry) => entry.level).filter(Number.isFinite), 0);
  const maximumCr = Math.max(0, ...participantCopies(context.enemies).map((entry) => Number(entry.cr) || 0));
  let score = 0;
  const factors = [];
  if (partyCount && enemyCount > partyCount * 2) {
    score += 1;
    factors.push("many-enemies");
  }
  if (averageLevel && maximumCr >= averageLevel + 3) {
    score += 1;
    factors.push("high-cr-spike");
  }
  const actionRatio = models.actionEconomy?.metrics?.enemyToPartyRatio ?? 1;
  if (actionRatio >= 1.5 || actionRatio <= 0.55) {
    score += 1;
    factors.push("action-imbalance");
  }
  if (context.conditions?.partySurprised || context.conditions?.enemyReinforcements) {
    score += 1;
    factors.push("swingy-context");
  }
  const id = score <= 0 ? "low" : score === 1 ? "medium" : score === 2 ? "high" : "severe";
  return { id, score, factors };
}

export function calculateConfidence(context, models) {
  const party = participantCopies(context.party);
  const enemies = participantCopies(context.enemies);
  const all = [...party, ...enemies];
  if (!all.length) return { id: "low", score: 0, reasons: ["no-participants"] };
  const completeness = average(all.map((entry) => {
    const fields = [
      entry.name,
      entry.side,
      Number.isFinite(entry.level) || Number.isFinite(entry.cr),
      Number.isFinite(entry.xp),
      entry.hp?.max > 0,
      Number.isFinite(entry.actions)
    ];
    return fields.filter(Boolean).length / fields.length;
  }), 0);
  const modelConfidence = average(Object.values(models).map((model) => model.confidence).filter(Number.isFinite), 0.5);
  const score = round((completeness * 0.6) + (modelConfidence * 0.4), 3);
  return {
    id: score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low",
    score,
    reasons: score < 0.8 ? ["incomplete-actor-data"] : []
  };
}

export function aggregateAssessment(context, options = {}) {
  const models = {
    rules2024: calculate2024Budget(context.party, context.enemies),
    rules2014: calculate2014Thresholds(context.party, context.enemies),
    crRatio: calculateCrRatio(context.party, context.enemies),
    actionEconomy: calculateActionEconomy(context.party, context.enemies),
    resources: calculateResourcePressure(context.party),
    tactical: calculateTacticalContext(context.conditions)
  };
  const weights = { ...DEFAULT_MODEL_WEIGHTS, ...(options.weights ?? {}) };
  const baseScore = weightedAverage(Object.entries(models).map(([id, result]) => ({
    value: id === "resources" || id === "tactical" ? 2 + result.score : result.score,
    weight: weights[id] ?? 0
  })), 0);
  const score = clamp(baseScore, 0, 4.5);
  const classification = SCORE_BANDS.find((band) => score <= band.maximum)?.id ?? "extreme";
  const volatility = calculateVolatility(context, models);
  const confidence = calculateConfidence(context, models);
  const warnings = [...new Set(Object.values(models).flatMap((model) => model.warnings ?? []))];
  if (Math.abs(models.rules2024.score - models.rules2014.score) >= 2) warnings.push("rules-model-divergence");
  return {
    schemaVersion: 4,
    generatedAt: new Date().toISOString(),
    classification,
    score: round(score, 2),
    volatility,
    confidence,
    models,
    warnings: [...new Set(warnings)],
    context: snapshotAssessmentContext(context)
  };
}
