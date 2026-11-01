// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { generateEncounterCooperatively } from "../core/encounter.js";
import { MODULE_ID } from "../core/constants.js";

function abortError() {
  const error = new Error("Encounter generation was cancelled.");
  error.name = "AbortError";
  return error;
}

function yieldToBrowser() {
  if (typeof globalThis.scheduler?.yield === "function") return globalThis.scheduler.yield();
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(() => resolve());
    } else {
      globalThis.setTimeout(resolve, 0);
    }
  });
}

async function generateCooperatively(input, { signal, onProgress } = {}) {
  return generateEncounterCooperatively(input, {
    signal,
    onProgress,
    abortError,
    yieldControl: yieldToBrowser,
    yieldEvery: 512
  });
}

export function generationWorkerUrl() {
  const route = `modules/${MODULE_ID}/scripts/workers/encounter-generator-worker.js`;
  const foundryRoute = globalThis.foundry?.utils?.getRoute?.(route);
  if (foundryRoute) return foundryRoute;
  const base = globalThis.document?.baseURI ?? globalThis.location?.href;
  if (base && typeof globalThis.URL === "function") return new URL(route, base).href;
  return route;
}

export function supportsGenerationWorker() {
  return typeof globalThis.Worker === "function";
}

export async function generateEncounterAsync(input, { signal, onProgress, preferWorker = true } = {}) {
  if (signal?.aborted) throw abortError();
  if (!preferWorker || !supportsGenerationWorker()) {
    return generateCooperatively(input, { signal, onProgress });
  }

  let worker;
  try {
    worker = new Worker(generationWorkerUrl(), { type: "module" });
  } catch {
    return generateCooperatively(input, { signal, onProgress });
  }

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener?.("abort", onAbort);
      worker.terminate();
      callback(value);
    };
    const onAbort = () => finish(reject, abortError());
    signal?.addEventListener?.("abort", onAbort, { once: true });
    worker.addEventListener("error", (event) => {
      finish(reject, event.error ?? new Error(event.message || "Encounter generation worker failed."));
    }, { once: true });
    worker.addEventListener("message", (event) => {
      const message = event.data ?? {};
      if (message.id !== id) return;
      if (message.type === "progress") {
        onProgress?.(message.progress);
        return;
      }
      if (message.type === "result") {
        finish(resolve, message.encounter);
        return;
      }
      if (message.type === "error") {
        const error = new Error(message.error?.message ?? "Encounter generation failed.");
        error.name = message.error?.name ?? "Error";
        if (message.error?.stack) error.stack = message.error.stack;
        finish(reject, error);
      }
    });
    worker.postMessage({ id, input });
  });
}
