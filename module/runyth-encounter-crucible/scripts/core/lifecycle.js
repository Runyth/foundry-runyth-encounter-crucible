// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function createLifecycleGate() {
  let ready = false;
  let readyValue;
  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  return Object.freeze({
    get isReady() {
      return ready;
    },
    whenReady() {
      return readyPromise;
    },
    markReady(value) {
      if (!ready) {
        ready = true;
        readyValue = value;
        resolveReady(value);
      }
      return readyValue;
    }
  });
}

export function exposeApi(game, moduleId, api) {
  if (!game || !api) return false;
  const module = game.modules?.get?.(moduleId);
  if (module) module.api = api;
  game.encounterCrucible = api;
  game.encounterCrucibleApi = api;
  return Boolean(module);
}
