// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { normalizeActor } from "./actor-normalizer.js";

let folderIndexCache = null;
let normalizedActorCache = new WeakMap();
const candidateListCache = new Map();

function allActorFolders() {
  return (globalThis.game?.folders?.contents ?? []).filter((folder) => folder.type === "Actor");
}

function buildFolderIndex() {
  const folders = allActorFolders();
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const children = new Map();
  for (const folder of folders) {
    const parentId = folder.folder?.id ?? folder.folder ?? null;
    if (!parentId) continue;
    const siblings = children.get(parentId) ?? [];
    siblings.push(folder);
    children.set(parentId, siblings);
  }
  const labelById = new Map();
  const labelFor = (folder) => {
    if (labelById.has(folder.id)) return labelById.get(folder.id);
    const names = [folder.name];
    const visited = new Set([folder.id]);
    let parentId = folder.folder?.id ?? folder.folder ?? null;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) break;
      names.unshift(parent.name);
      parentId = parent.folder?.id ?? parent.folder ?? null;
    }
    const label = names.join(" / ");
    labelById.set(folder.id, label);
    return label;
  };
  for (const folder of folders) labelFor(folder);
  return { folders, byId, children, labelById };
}

function folderIndex() {
  folderIndexCache ??= buildFolderIndex();
  return folderIndexCache;
}

function cloneCandidate(candidate) {
  return {
    ...candidate,
    hp: candidate.hp ? { ...candidate.hp } : candidate.hp,
    source: candidate.source ? { ...candidate.source } : candidate.source
  };
}

function normalizedCandidate(actor) {
  let candidate = normalizedActorCache.get(actor);
  if (!candidate) {
    candidate = normalizeActor(actor, { side: "enemy", contribution: 1 });
    normalizedActorCache.set(actor, candidate);
  }
  return cloneCandidate(candidate);
}

export function invalidateActorCandidateCache(actor = null) {
  if (actor && typeof actor === "object") normalizedActorCache.delete(actor);
  else normalizedActorCache = new WeakMap();
  candidateListCache.clear();
}

export function invalidateActorFolderCache() {
  folderIndexCache = null;
  candidateListCache.clear();
}

export function actorFolderOptions() {
  const index = folderIndex();
  return index.folders
    .map((folder) => ({ id: folder.id, name: index.labelById.get(folder.id) ?? folder.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function descendantActorFolders(folder) {
  if (!folder) return [];
  const { children } = folderIndex();
  const descendants = [];
  const queue = [folder.id];
  const seen = new Set(queue);
  for (let index = 0; index < queue.length; index += 1) {
    for (const child of children.get(queue[index]) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      descendants.push(child);
      queue.push(child.id);
    }
  }
  return descendants;
}

export function actorsInFolder(folderId, recursive = true) {
  const folder = folderIndex().byId.get(folderId) ?? globalThis.game?.folders?.get?.(folderId);
  if (!folder) return [];
  const folderIds = new Set([folder.id]);
  if (recursive) {
    for (const entry of descendantActorFolders(folder)) folderIds.add(entry.id);
  }
  return (globalThis.game?.actors?.contents ?? []).filter((actor) => {
    const actorFolderId = actor.folder?.id ?? actor.folder ?? null;
    return folderIds.has(actorFolderId);
  });
}

export function actorCandidates(folderId = null, recursive = true) {
  const key = `${folderId ?? "*"}:${recursive ? 1 : 0}`;
  let cached = candidateListCache.get(key);
  if (!cached) {
    const actors = folderId
      ? actorsInFolder(folderId, recursive)
      : (globalThis.game?.actors?.contents ?? []).filter((actor) => actor.type === "npc");
    cached = actors
      .filter((actor) => actor.type === "npc")
      .map(normalizedCandidate);
    candidateListCache.set(key, cached);
  }
  return cached.map(cloneCandidate);
}
