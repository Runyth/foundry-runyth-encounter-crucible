// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { generateEncounter } from "../core/encounter.js";

self.addEventListener("message", (event) => {
  const { id, input } = event.data ?? {};
  if (!id) return;
  try {
    const encounter = generateEncounter(input, {
      onProgress: (progress) => self.postMessage({ id, type: "progress", progress })
    });
    self.postMessage({ id, type: "result", encounter });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
        stack: error?.stack ?? null
      }
    });
  }
});
