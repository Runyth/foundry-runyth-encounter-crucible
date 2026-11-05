// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
export const MODULE_ID = "runyth-encounter-crucible";
export const MODULE_VERSION = "1.9.3";
export const API_VERSION = "2.7.5";
export const SCHEMA_VERSION = 4;
export const ENCOUNTER_GENERATION_CAPABILITY_VERSION = "1.0.1";
export const COLLECT_ACTORS_CAPABILITY_VERSION = "1.0.0";
export const ASSESS_ENCOUNTER_CAPABILITY_VERSION = "1.0.0";

export const DIFFICULTY_SCORES = Object.freeze({
  trivial: 0,
  low: 1,
  easy: 1,
  manageable: 1,
  moderate: 2,
  medium: 2,
  challenging: 2,
  high: 3,
  hard: 3,
  dangerous: 3,
  deadly: 4,
  extreme: 4
});

export const SCORE_BANDS = Object.freeze([
  { maximum: 0.74, id: "trivial" },
  { maximum: 1.49, id: "manageable" },
  { maximum: 2.49, id: "challenging" },
  { maximum: 3.49, id: "dangerous" },
  { maximum: Number.POSITIVE_INFINITY, id: "extreme" }
]);

export const XP_BUDGET_2024 = Object.freeze({
  1: { low: 50, moderate: 75, high: 100 },
  2: { low: 100, moderate: 150, high: 200 },
  3: { low: 150, moderate: 225, high: 400 },
  4: { low: 250, moderate: 375, high: 500 },
  5: { low: 500, moderate: 750, high: 1100 },
  6: { low: 600, moderate: 1000, high: 1400 },
  7: { low: 750, moderate: 1300, high: 1700 },
  8: { low: 1000, moderate: 1700, high: 2100 },
  9: { low: 1300, moderate: 2000, high: 2600 },
  10: { low: 1600, moderate: 2300, high: 3100 },
  11: { low: 1900, moderate: 2900, high: 4100 },
  12: { low: 2200, moderate: 3700, high: 4700 },
  13: { low: 2600, moderate: 4200, high: 5400 },
  14: { low: 2900, moderate: 4900, high: 6200 },
  15: { low: 3300, moderate: 5400, high: 7800 },
  16: { low: 3800, moderate: 6100, high: 9800 },
  17: { low: 4500, moderate: 7200, high: 11700 },
  18: { low: 5000, moderate: 8700, high: 14200 },
  19: { low: 5500, moderate: 10700, high: 17200 },
  20: { low: 6400, moderate: 13200, high: 22000 }
});

export const XP_THRESHOLDS_2014 = Object.freeze({
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 }
});

export const CR_XP = Object.freeze({
  "0": 10,
  "0.125": 25,
  "0.25": 50,
  "0.5": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
});

export const MULTIPLIER_STEPS_2014 = Object.freeze([
  { maximum: 1, multiplier: 1 },
  { maximum: 2, multiplier: 1.5 },
  { maximum: 6, multiplier: 2 },
  { maximum: 10, multiplier: 2.5 },
  { maximum: 14, multiplier: 3 },
  { maximum: Number.POSITIVE_INFINITY, multiplier: 4 }
]);

export const TACTICAL_MODIFIERS = Object.freeze({
  partySurprised: 0.75,
  enemiesSurprised: -0.75,
  enemyPrepared: 0.5,
  partyPrepared: -0.35,
  enemyHighGround: 0.35,
  partyHighGround: -0.25,
  enemyChokePoint: 0.5,
  partyChokePoint: -0.4,
  noRetreat: 0.35,
  protectObjective: 0.3,
  timedObjective: 0.25,
  hazardousTerrain: 0.25,
  enemyReinforcements: 0.5,
  partyReinforcements: -0.4,
  poorVisibilityForParty: 0.3,
  poorVisibilityForEnemies: -0.2
});

export const DEFAULT_MODEL_WEIGHTS = Object.freeze({
  rules2024: 0.28,
  rules2014: 0.2,
  crRatio: 0.12,
  actionEconomy: 0.18,
  resources: 0.12,
  tactical: 0.1
});
