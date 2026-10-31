// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../core/constants.js";
import { requireCurrentUserGM } from "../core/permissions.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

export function buildEncounterSummaryContent(encounter, visibility) {
  const assessment = encounter?.assessment;
  if (!assessment) throw new Error("The encounter has not been assessed.");
  const heading = escapeHtml(encounter.name);
  const overall = escapeHtml(localize("EC.Dashboard.Overall"));
  const summary = visibility === "vague"
    ? `<p>${escapeHtml(localize("EC.Chat.Vague", "The battle appears"))} <strong>${escapeHtml(assessment.classification)}</strong>.</p>`
    : `<p><strong>${overall}:</strong> ${escapeHtml(assessment.classification)} · ${escapeHtml(assessment.volatility.id)} · ${escapeHtml(assessment.confidence.id)}</p>
      <ul>
        <li>${escapeHtml(localize("EC.Models.Rules2024"))}: ${escapeHtml(assessment.models.rules2024?.classification ?? "—")}</li>
        <li>${escapeHtml(localize("EC.Models.Rules2014"))}: ${escapeHtml(assessment.models.rules2014?.classification ?? "—")}</li>
        <li>${escapeHtml(localize("EC.Models.ActionEconomy"))}: ${escapeHtml(assessment.models.actionEconomy?.classification ?? "—")}</li>
      </ul>`;
  return `<section class="encounter-crucible-chat"><h3>${heading}</h3>${summary}</section>`;
}

export async function postEncounterSummary(encounter, options = {}) {
  requireCurrentUserGM("post encounter summaries");
  const configuredVisibility = options.visibility ?? globalThis.game.settings.get(MODULE_ID, "playerVisibility");
  const visibility = ["hidden", "vague", "full"].includes(configuredVisibility) ? configuredVisibility : "hidden";
  const ChatMessage = globalThis.foundry?.documents?.ChatMessage;
  if (!ChatMessage) throw new Error("Foundry ChatMessage API is unavailable.");

  const data = {
    content: buildEncounterSummaryContent(encounter, visibility),
    speaker: ChatMessage.getSpeaker()
  };
  if (visibility === "hidden") {
    data.whisper = ChatMessage.getWhisperRecipients("GM").map((user) => user.id).filter(Boolean);
    if (!data.whisper.length) throw new Error("No GM recipient is available for the private encounter summary.");
  }
  return ChatMessage.create(data);
}
