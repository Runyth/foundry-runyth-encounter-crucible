// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
function normalizeVersion(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError("A semantic version string is required.");
  }
  const source = String(value).trim().replace(/^v/i, "").split("+", 1)[0].split("-", 1)[0];
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(source);
  if (!match) throw new TypeError(`Invalid semantic version '${value}'.`);
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

export function compareVersions(left, right) {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function testComparator(current, operator, required) {
  const comparison = compareVersions(current, required);
  if (operator === ">=") return comparison >= 0;
  if (operator === ">") return comparison > 0;
  if (operator === "<=") return comparison <= 0;
  if (operator === "<") return comparison < 0;
  return comparison === 0;
}

function testWildcard(current, requirement) {
  const currentParts = normalizeVersion(current);
  const requested = String(requirement).trim().replace(/^v/i, "").split(".");
  return requested.every((part, index) => part === "x" || part === "X" || part === "*" || currentParts[index] === Number(part));
}

export function satisfiesVersion(current, requirement) {
  if (requirement === undefined || requirement === null || requirement === "") return true;
  if (Array.isArray(requirement)) return requirement.every((entry) => satisfiesVersion(current, entry));
  if (typeof requirement === "object") {
    const minimum = requirement.minimum ?? requirement.min;
    const maximum = requirement.maximum ?? requirement.max;
    return (!minimum || compareVersions(current, minimum) >= 0)
      && (!maximum || compareVersions(current, maximum) <= 0);
  }
  const source = String(requirement).trim();
  const range = /^(\S+)\s+-\s+(\S+)$/.exec(source);
  if (range) return compareVersions(current, range[1]) >= 0 && compareVersions(current, range[2]) <= 0;
  const clauses = source.split(/\s+/).filter(Boolean);
  return clauses.every((clause) => {
    if (/[xX*]/.test(clause)) return testWildcard(current, clause);
    const match = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(clause);
    const operator = match?.[1] ?? "=";
    const required = match?.[2] ?? clause;
    if (operator === "^") {
      const [major] = normalizeVersion(required);
      return compareVersions(current, required) >= 0 && compareVersions(current, `${major + 1}.0.0`) < 0;
    }
    if (operator === "~") {
      const [major, minor] = normalizeVersion(required);
      return compareVersions(current, required) >= 0 && compareVersions(current, `${major}.${minor + 1}.0`) < 0;
    }
    return testComparator(current, operator, required);
  });
}

export function assertVersion(current, requirement, label = "Version") {
  if (!satisfiesVersion(current, requirement)) {
    throw new Error(`${label} ${current} does not satisfy '${typeof requirement === "object" ? JSON.stringify(requirement) : requirement}'.`);
  }
  return true;
}
