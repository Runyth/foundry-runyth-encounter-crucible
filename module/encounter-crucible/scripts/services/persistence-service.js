// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../core/constants.js";
import { formatEncounterName } from "../core/encounter.js";

async function ensureFolder(name, type, parent = null) {
  const folders = globalThis.game?.folders?.contents ?? [];
  const existing = folders.find((folder) => {
    const parentId = folder.folder?.id ?? folder.folder ?? null;
    return folder.type === type && folder.name === name && parentId === (parent?.id ?? null);
  });
  if (existing) return existing;
  const Folder = globalThis.foundry?.documents?.Folder;
  if (!Folder) throw new Error("Foundry Folder API is unavailable.");
  return Folder.create({ name, type, folder: parent?.id ?? null, sorting: "a" });
}

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function difficultyLabel(id) {
  if (!id) return localize("EC.Journal.Unassessed", "Unassessed");
  const normalized = String(id);
  const key = `EC.Difficulty.${normalized[0].toUpperCase()}${normalized.slice(1)}`;
  return localize(key, normalized);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function participantRows(entries) {
  return entries.map((entry) => `<tr><td>${escapeHtml(entry.name)}</td><td>${entry.quantity ?? 1}</td><td>${entry.level ?? entry.cr ?? "—"}</td><td>${entry.xp ?? 0}</td></tr>`).join("");
}

export function encounterHtml(encounter) {
  const assessment = encounter.assessment;
  const models = assessment?.models ?? {};
  const unknown = localize("EC.Journal.Unknown", "unknown");
  return `
    <section class="encounter-crucible-journal">
      <h1>${escapeHtml(encounter.name)}</h1>
      <p><strong>${escapeHtml(localize("EC.Dashboard.Theme", "Theme"))}:</strong> ${escapeHtml(encounter.theme)}</p>
      <p><strong>${escapeHtml(localize("EC.Journal.Assessment", "Assessment"))}:</strong> ${escapeHtml(difficultyLabel(assessment?.classification))} · ${escapeHtml(assessment?.volatility?.id ?? unknown)} ${escapeHtml(localize("EC.Dashboard.Volatility", "volatility"))} · ${escapeHtml(assessment?.confidence?.id ?? unknown)} ${escapeHtml(localize("EC.Dashboard.Confidence", "confidence"))}</p>
      <h2>${escapeHtml(localize("EC.Journal.Party", "Party"))}</h2>
      <table><thead><tr><th>${escapeHtml(localize("EC.Field.Name", "Name"))}</th><th>${escapeHtml(localize("EC.Field.Quantity", "Quantity"))}</th><th>${escapeHtml(localize("EC.Field.Level", "Level"))}</th><th>XP</th></tr></thead><tbody>${participantRows(encounter.party ?? [])}</tbody></table>
      <h2>${escapeHtml(localize("EC.Journal.Enemies", "Enemies"))}</h2>
      <table><thead><tr><th>${escapeHtml(localize("EC.Field.Name", "Name"))}</th><th>${escapeHtml(localize("EC.Field.Quantity", "Quantity"))}</th><th>${escapeHtml(localize("EC.Field.CR", "CR"))}</th><th>XP</th></tr></thead><tbody>${participantRows(encounter.enemies ?? [])}</tbody></table>
      <h2>${escapeHtml(localize("EC.Dashboard.Models", "Models"))}</h2>
      <ul>
        <li>${escapeHtml(localize("EC.Models.Rules2024", "D&D 2024 XP"))}: ${escapeHtml(difficultyLabel(models.rules2024?.classification))}</li>
        <li>${escapeHtml(localize("EC.Models.Rules2014", "D&D 2014 adjusted XP"))}: ${escapeHtml(difficultyLabel(models.rules2014?.classification))}</li>
        <li>${escapeHtml(localize("EC.Models.CrRatio", "CR ratio"))}: ${escapeHtml(difficultyLabel(models.crRatio?.classification))}</li>
        <li>${escapeHtml(localize("EC.Models.ActionEconomy", "Action economy"))}: ${escapeHtml(difficultyLabel(models.actionEconomy?.classification))}</li>
      </ul>
    </section>`;
}

export async function saveEncounter(encounter, options = {}) {
  if (!globalThis.game?.user?.isGM) throw new Error("Only a GM can save Encounter Crucible encounters.");
  const rootName = globalThis.game.settings.get(MODULE_ID, "journalRootFolder") || "Encounter Crucible";
  const namingFormat = globalThis.game.settings.get(MODULE_ID, "savedNameFormat") || "{date} - {theme} - {name}";
  const root = await ensureFolder(rootName, "JournalEntry");
  const theme = String(options.theme ?? encounter.theme ?? "General").trim() || "General";
  const themeFolder = await ensureFolder(theme, "JournalEntry", root);
  const name = formatEncounterName(options.nameFormat ?? namingFormat, encounter);
  const data = {
    name,
    folder: themeFolder.id,
    ownership: { default: 0 },
    flags: {
      [MODULE_ID]: {
        kind: "encounter",
        schemaVersion: encounter.schemaVersion,
        encounter
      }
    },
    pages: [{
      name: encounter.name,
      type: "text",
      text: { content: encounterHtml(encounter), format: 1 },
      ownership: { default: -1 }
    }]
  };
  const JournalEntry = globalThis.foundry?.documents?.JournalEntry;
  if (!JournalEntry) throw new Error("Foundry JournalEntry API is unavailable.");
  const journal = await JournalEntry.create(data);
  encounter.journalUuid = journal.uuid;
  try {
    await journal.setFlag(MODULE_ID, "encounter", encounter);
    return journal;
  } catch (error) {
    try {
      await journal.delete();
    } catch (rollbackError) {
      console.error("[encounter-crucible] Could not roll back a partially saved Journal entry.", rollbackError);
    }
    throw error;
  }
}

export function encounterFromJournal(journal) {
  return journal?.getFlag?.(MODULE_ID, "encounter") ?? journal?.flags?.[MODULE_ID]?.encounter ?? null;
}

export function listSavedEncounters() {
  return (globalThis.game?.journal?.contents ?? [])
    .map((journal) => ({ journal, encounter: encounterFromJournal(journal) }))
    .filter((entry) => entry.encounter);
}
