// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { assertVersion, satisfiesVersion } from "./version.js";

function normalizeDefinition(id, definition) {
  if (!definition || (typeof definition !== "object" && typeof definition !== "function")) {
    throw new TypeError(`Capability '${id}' requires a definition.`);
  }
  const api = typeof definition === "function" ? definition : definition.api;
  if (api == null || (typeof api !== "object" && typeof api !== "function")) {
    throw new TypeError(`Capability '${id}' requires an API object or function.`);
  }
  const version = String(definition.version ?? api.capabilityVersion ?? api.version ?? "0.0.0").trim() || "0.0.0";
  return Object.freeze({
    id,
    name: id,
    version,
    capabilityVersion: version,
    available: true,
    api
  });
}

export function createCapabilityCatalog(definitions) {
  if (!definitions || typeof definitions !== "object" || Array.isArray(definitions)) {
    throw new TypeError("Capability definitions must be an object.");
  }

  const descriptors = {};
  const versions = {};
  const features = {};
  const flags = {};
  for (const [id, definition] of Object.entries(definitions)) {
    if (!id.trim()) throw new TypeError("Capability ids must be non-empty strings.");
    const descriptor = normalizeDefinition(id, definition);
    descriptors[id] = descriptor;
    versions[id] = descriptor.version;
    features[id] = descriptor.api;
    flags[id] = true;
  }

  const frozenDescriptors = Object.freeze(descriptors);
  const frozenVersions = Object.freeze(versions);
  const frozenFeatures = Object.freeze(features);
  const frozenFlags = Object.freeze(flags);
  const names = Object.keys(descriptors);

  function get(id) {
    return typeof id === "string" ? frozenFeatures[id] ?? null : null;
  }

  function getDescriptor(id) {
    return typeof id === "string" ? frozenDescriptors[id] ?? null : null;
  }

  function has(id, requirement = null) {
    const descriptor = getDescriptor(id);
    if (!descriptor) return false;
    return requirement == null || satisfiesVersion(descriptor.version, requirement);
  }

  function assert(id, requirement = null) {
    const descriptor = getDescriptor(id);
    if (!descriptor) throw new Error(`Runyth Encounter Crucible does not provide the '${String(id)}' capability.`);
    if (requirement != null) assertVersion(descriptor.version, requirement, `Runyth Encounter Crucible capability '${id}'`);
    return true;
  }

  Object.defineProperties(names, {
    descriptors: { value: frozenDescriptors },
    versions: { value: frozenVersions },
    features: { value: frozenFeatures },
    map: { value: frozenFlags },
    get: { value: get },
    getDescriptor: { value: getDescriptor },
    has: { value: has },
    assert: { value: assert }
  });
  for (const [id, api] of Object.entries(frozenFeatures)) {
    Object.defineProperty(names, id, { value: api });
  }

  return Object.freeze({
    names: Object.freeze(names),
    descriptors: frozenDescriptors,
    versions: frozenVersions,
    features: frozenFeatures,
    map: frozenFlags,
    get,
    getDescriptor,
    has,
    assert
  });
}
