// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { createCapabilityCatalog } from "../module/runyth-encounter-crucible/scripts/core/capability-catalog.js";

test("capability catalog supports array, property, map, and descriptor discovery", () => {
  const generation = Object.freeze(() => "generated");
  const registry = Object.freeze({ register() {} });
  const catalog = createCapabilityCatalog({
    encounterGeneration: { version: "1.0.1", api: generation },
    helperModuleRegistry: { version: "1.0.0", api: registry }
  });

  assert.deepEqual(catalog.names, ["encounterGeneration", "helperModuleRegistry"]);
  assert.equal(catalog.names.includes("encounterGeneration"), true);
  assert.equal(catalog.names.encounterGeneration, generation);
  assert.equal(catalog.names.helperModuleRegistry, registry);
  assert.equal(catalog.map.encounterGeneration, true);
  assert.equal(catalog.features.encounterGeneration, generation);
  assert.equal(catalog.versions.encounterGeneration, "1.0.1");
  assert.equal(catalog.descriptors.encounterGeneration.api, generation);
  assert.equal(catalog.get("encounterGeneration"), generation);
  assert.equal(catalog.getDescriptor("encounterGeneration").version, "1.0.1");
  assert.equal(Object.isFrozen(catalog.names), true);
  assert.equal(Object.isFrozen(catalog.descriptors.encounterGeneration), true);
});

test("capability catalog performs version-aware checks without weakening simple presence checks", () => {
  const catalog = createCapabilityCatalog({
    encounterGeneration: { version: "1.0.1", api: () => null }
  });

  assert.equal(catalog.has("encounterGeneration"), true);
  assert.equal(catalog.has("encounterGeneration", ">=1.0.0 <2.0.0"), true);
  assert.equal(catalog.has("encounterGeneration", ">=1.1.0"), false);
  assert.equal(catalog.has("missing"), false);
  assert.equal(catalog.assert("encounterGeneration", "^1.0.0"), true);
  assert.throws(() => catalog.assert("encounterGeneration", ">=2.0.0"), /does not satisfy/);
  assert.throws(() => catalog.assert("missing"), /does not provide/);
});

test("malformed capability definitions fail before public API exposure", () => {
  assert.throws(() => createCapabilityCatalog(null), /definitions must be an object/);
  assert.throws(() => createCapabilityCatalog({ "": { api: {} } }), /ids must be non-empty/);
  assert.throws(() => createCapabilityCatalog({ invalid: {} }), /requires an API/);
});
