// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../core/constants.js";

const listenersByOwner = new WeakMap();
const actionsByOwner = new WeakMap();

function reportListenerError(error) {
  console.error(`[${MODULE_ID}] Application action failed.`, error);
  globalThis.ui?.notifications?.error?.(error?.message ?? String(error));
}

function setBusy(target, busy) {
  if (!target || typeof target !== "object") return;
  if (busy) {
    target.dataset ??= {};
    target.dataset.ecWasDisabled = target.disabled ? "true" : "false";
    target.disabled = true;
    target.setAttribute?.("aria-busy", "true");
    target.classList?.add?.("ec-is-busy");
    return;
  }
  target.disabled = target.dataset?.ecWasDisabled === "true";
  if (target.dataset) delete target.dataset.ecWasDisabled;
  target.removeAttribute?.("aria-busy");
  target.classList?.remove?.("ec-is-busy");
}

async function runBusyAction(owner, key, target, action) {
  return runActionOnce(owner, key, async () => {
    setBusy(target, true);
    try {
      return await action();
    } finally {
      setBusy(target, false);
    }
  });
}

export function releaseOwnedListeners(owner) {
  listenersByOwner.get(owner)?.abort();
  listenersByOwner.delete(owner);
}

export function runActionOnce(owner, key, action) {
  let pending = actionsByOwner.get(owner);
  if (!pending) {
    pending = new Map();
    actionsByOwner.set(owner, pending);
  }
  if (pending.has(key)) return pending.get(key);
  const promise = Promise.resolve()
    .then(action)
    .finally(() => {
      pending.delete(key);
      if (!pending.size) actionsByOwner.delete(owner);
    });
  pending.set(key, promise);
  return promise;
}

export function bindOwnedListeners(owner, root, { actions = {}, changes = {}, keydowns = {}, submit = null } = {}) {
  releaseOwnedListeners(owner);
  if (!root?.addEventListener) return null;

  const controller = new AbortController();
  listenersByOwner.set(owner, controller);
  const listenerOptions = { signal: controller.signal };

  root.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-action]");
    if (!target || !root.contains(target)) return;
    const actionId = target.dataset.action;
    const handler = actions[actionId];
    if (!handler) return;
    event.preventDefault();
    void runBusyAction(owner, actionId, target, () => handler(event, target)).catch(reportListenerError);
  }, listenerOptions);

  if (Object.keys(changes).length) {
    root.addEventListener("change", (event) => {
      const target = event.target;
      if (!target?.matches) return;
      for (const [selector, handler] of Object.entries(changes)) {
        if (!target.matches(selector)) continue;
        void runActionOnce(owner, `change:${selector}`, () => handler(event, target)).catch(reportListenerError);
        break;
      }
    }, listenerOptions);
  }

  if (Object.keys(keydowns).length) {
    root.addEventListener("keydown", (event) => {
      const target = event.target;
      if (!target?.matches) return;
      for (const [selector, handler] of Object.entries(keydowns)) {
        if (!target.matches(selector)) continue;
        void runActionOnce(owner, `keydown:${selector}:${event.key}`, () => handler(event, target)).catch(reportListenerError);
        break;
      }
    }, listenerOptions);
  }

  if (submit) {
    root.addEventListener("submit", (event) => {
      const form = event.target;
      if (!form?.matches?.("form")) return;
      event.preventDefault();
      void runBusyAction(owner, "submit", event.submitter, () => submit(event, form)).catch(reportListenerError);
    }, listenerOptions);
  }

  return controller;
}

function cleanPosition(position) {
  if (!position || typeof position !== "object") return {};
  const cleaned = {};
  for (const key of ["left", "top", "width", "height"]) {
    const value = Number(position[key]);
    if (Number.isFinite(value)) cleaned[key] = value;
  }
  return cleaned;
}

export function readStoredPosition(settingKey) {
  try {
    return cleanPosition(globalThis.game?.settings?.get?.(MODULE_ID, settingKey));
  } catch {
    return {};
  }
}

export async function saveStoredPosition(settingKey, position) {
  const cleaned = cleanPosition(position);
  if (!Object.keys(cleaned).length) return;
  try {
    await globalThis.game?.settings?.set?.(MODULE_ID, settingKey, cleaned);
  } catch (error) {
    console.debug(`[${MODULE_ID}] Could not persist ${settingKey}.`, error);
  }
}
