// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { createHelperModuleRegistry } from "../module/runyth-encounter-crucible/scripts/core/helper-registry.js";

test("helper modules register through descriptor and stable aliases", () => {
  const registered = [];
  const registry = createHelperModuleRegistry({
    onRegister(descriptor, previous) {
      registered.push({ descriptor, previous });
    }
  });
  const forgeApi = { version: "1.2.3", capabilities: ["encounterGeneration"] };
  const descriptor = registry.registerHelperModule({
    id: "runyth-encounter-crucible-forge",
    api: forgeApi,
    capabilities: ["encounterGeneration", "encounterGeneration"]
  });

  assert.equal(descriptor.id, "runyth-encounter-crucible-forge");
  assert.equal(descriptor.moduleId, "runyth-encounter-crucible-forge");
  assert.equal(descriptor.version, "1.2.3");
  assert.equal(descriptor.api, forgeApi);
  assert.deepEqual(descriptor.capabilities, ["encounterGeneration"]);
  assert.equal(registry.getHelperModule(descriptor.id), descriptor);
  assert.equal(registry.getHelper(descriptor.id), descriptor);
  assert.equal(registry.hasHelperModule(descriptor.id), true);
  assert.equal(registry.hasHelper(descriptor.id), true);
  assert.deepEqual(registry.listHelperModules(), [descriptor]);
  assert.deepEqual(registry.listHelpers(), [descriptor]);
  assert.equal(registered.length, 1);
  assert.equal(Object.isFrozen(descriptor), true);
  assert.equal(Object.isFrozen(descriptor.capabilities), true);
});

test("helper registration supports common id, version, api and id, api, options signatures", () => {
  const registry = createHelperModuleRegistry();
  const firstApi = { name: "first" };
  const secondApi = () => "second";

  const first = registry.register("first-helper", "2.0.0", firstApi);
  const second = registry.registerHelper("second-helper", secondApi, {
    version: "3.1.4",
    capabilities: { forge: true, disabled: false }
  });

  assert.equal(first.version, "2.0.0");
  assert.equal(first.api, firstApi);
  assert.equal(second.version, "3.1.4");
  assert.equal(second.api, secondApi);
  assert.deepEqual(second.capabilities, ["forge"]);
});

test("helper registration is idempotent for the same implementation and rejects conflicts", () => {
  const registry = createHelperModuleRegistry();
  const helperApi = { version: "1.0.0" };
  const first = registry.registerHelperModule("helper", helperApi);
  const second = registry.registerHelperModule("helper", helperApi);

  assert.equal(second, first);
  assert.throws(
    () => registry.registerHelperModule("helper", { version: "1.0.0" }),
    /already registered/
  );
  const replacement = registry.registerHelperModule("helper", { version: "1.0.1" }, { replace: true });
  assert.equal(replacement.version, "1.0.1");
});

test("helper modules unregister cleanly without exposing the mutable map", () => {
  const unregistered = [];
  const registry = createHelperModuleRegistry({ onUnregister: (descriptor) => unregistered.push(descriptor.id) });
  registry.registerHelperModule("helper", { version: "1.0.0" });

  assert.equal(registry.unregisterHelperModule("helper"), true);
  assert.equal(registry.unregisterHelper("helper"), false);
  assert.equal(registry.has("helper"), false);
  assert.deepEqual(registry.list(), []);
  assert.deepEqual(unregistered, ["helper"]);
  assert.equal(Object.isFrozen(registry), true);
});

test("malformed helper registrations are rejected", () => {
  const registry = createHelperModuleRegistry();
  assert.throws(() => registry.registerHelperModule(null), /descriptor or stable module id/);
  assert.throws(() => registry.registerHelperModule({ api: {} }), /stable module id/);
  assert.throws(() => registry.registerHelperModule("helper", null), /API object or function/);
});
