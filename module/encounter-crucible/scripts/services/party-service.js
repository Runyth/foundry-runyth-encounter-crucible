// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { normalizeActor } from "./actor-normalizer.js";

export function discoverPartyActors() {
  const users = globalThis.game?.users?.contents ?? [...(globalThis.game?.users ?? [])];
  const userCharacters = users
    .filter((user) => !user.isGM && user.active !== false && user.character)
    .map((user) => user.character);
  const ownedCharacters = (globalThis.game?.actors?.contents ?? [])
    .filter((actor) => actor.type === "character" && actor.hasPlayerOwner);
  const unique = new Map([...userCharacters, ...ownedCharacters].map((actor) => [actor.uuid ?? actor.id, actor]));
  return [...unique.values()];
}

export function discoverParty(options = {}) {
  return discoverPartyActors().map((actor) => normalizeActor(actor, {
    side: "party",
    contribution: options.contribution ?? 1
  }));
}
