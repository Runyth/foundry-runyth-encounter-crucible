// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
const REGISTRY_VERSION = "1.0.0";

function normalizeCapabilities(value) {
  if (value == null) return Object.freeze([]);
  const values = value instanceof Set
    ? [...value]
    : Array.isArray(value)
      ? value
      : typeof value === "object"
        ? Object.entries(value).filter(([, enabled]) => enabled === true).map(([id]) => id)
        : [value];
  const normalized = [...new Set(values
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  return Object.freeze(normalized);
}

function isDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return [
    "id",
    "moduleId",
    "module",
    "api",
    "helperApi",
    "instance",
    "replace"
  ].some((key) => Object.hasOwn(value, key));
}

function normalizeRegistration(input, second, third) {
  let source;
  if (typeof input === "string") {
    if (typeof second === "string") {
      source = { id: input, version: second, api: third };
    } else if (third && typeof third === "object" && !Array.isArray(third)) {
      source = { ...third, id: input, api: second };
    } else if (isDescriptor(second)) {
      source = { ...second, id: input };
    } else {
      source = { id: input, api: second };
    }
  } else if (input && typeof input === "object" && !Array.isArray(input)) {
    source = { ...input };
  } else {
    throw new TypeError("Helper-module registration requires a descriptor or stable module id.");
  }

  const id = String(source.id ?? source.moduleId ?? source.module?.id ?? "").trim();
  if (!id) throw new TypeError("Helper-module registration requires a stable module id.");

  const api = source.api ?? source.helperApi ?? source.instance ?? (typeof input === "object" ? input : null);
  if (api == null || (typeof api !== "object" && typeof api !== "function")) {
    throw new TypeError(`Helper module '${id}' requires an API object or function.`);
  }

  const version = String(
    source.version
      ?? source.moduleVersion
      ?? source.module?.version
      ?? api.version
      ?? api.apiVersion
      ?? "0.0.0"
  ).trim() || "0.0.0";

  const capabilities = normalizeCapabilities(source.capabilities ?? api.capabilities);
  const metadata = source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
    ? Object.freeze({ ...source.metadata })
    : Object.freeze({});

  return {
    replace: source.replace === true,
    descriptor: Object.freeze({
      id,
      moduleId: id,
      version,
      moduleVersion: version,
      api,
      capabilities,
      metadata
    })
  };
}

export function createHelperModuleRegistry({ onRegister, onUnregister } = {}) {
  const registry = new Map();

  function register(input, second, third) {
    const { descriptor, replace } = normalizeRegistration(input, second, third);
    const existing = registry.get(descriptor.id) ?? null;
    if (existing) {
      const identical = existing.api === descriptor.api
        && existing.version === descriptor.version
        && JSON.stringify(existing.capabilities) === JSON.stringify(descriptor.capabilities);
      if (identical) return existing;
      if (!replace) throw new Error(`Helper module '${descriptor.id}' is already registered.`);
    }
    registry.set(descriptor.id, descriptor);
    onRegister?.(descriptor, existing);
    return descriptor;
  }

  function unregister(id) {
    const key = String(id ?? "").trim();
    if (!key) return false;
    const existing = registry.get(key);
    if (!existing) return false;
    registry.delete(key);
    onUnregister?.(existing);
    return true;
  }

  function get(id) {
    return registry.get(String(id ?? "").trim()) ?? null;
  }

  function has(id) {
    return registry.has(String(id ?? "").trim());
  }

  function list() {
    return [...registry.values()];
  }

  return Object.freeze({
    version: REGISTRY_VERSION,
    registryVersion: REGISTRY_VERSION,
    register,
    registerHelper: register,
    registerHelperModule: register,
    unregister,
    unregisterHelper: unregister,
    unregisterHelperModule: unregister,
    get,
    getHelper: get,
    getHelperModule: get,
    has,
    hasHelper: has,
    hasHelperModule: has,
    list,
    listHelpers: list,
    listHelperModules: list
  });
}
