// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
export function isCurrentUserGM() {
  return Boolean(globalThis.game?.user?.isGM);
}

export function requireCurrentUserGM(action = "perform this Encounter Crucible action") {
  if (isCurrentUserGM()) return;
  throw new Error(`Only a GM can ${action}.`);
}
