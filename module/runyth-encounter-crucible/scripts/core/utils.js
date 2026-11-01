// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

export function asFiniteNumber(value, fallback = 0) {
  const parsed = typeof value === "string" ? Number(value.trim()) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseFraction(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!trimmed.includes("/")) return asFiniteNumber(trimmed, fallback);
  const [numerator, denominator] = trimmed.split("/", 2).map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
  return numerator / denominator;
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function average(values, fallback = 0) {
  return values.length ? sum(values) / values.length : fallback;
}

export function weightedAverage(entries, fallback = 0) {
  const valid = entries.filter(({ value, weight }) => Number.isFinite(value) && Number.isFinite(weight) && weight > 0);
  const weight = sum(valid.map((entry) => entry.weight));
  return weight > 0 ? sum(valid.map((entry) => entry.value * entry.weight)) / weight : fallback;
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

export function unique(values) {
  return [...new Set(values)];
}

export function stableSort(values, selector) {
  return values
    .map((value, index) => ({ value, index, key: selector(value) }))
    .sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : left.index - right.index)
    .map(({ value }) => value);
}

export function slugify(value, fallback = "encounter") {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
