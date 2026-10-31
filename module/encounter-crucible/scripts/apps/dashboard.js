// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { bindOwnedListeners, readStoredPosition, releaseOwnedListeners, saveStoredPosition } from "./application-lifecycle.js";
import { postEncounterSummary } from "../services/chat-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = globalThis.foundry.applications.api;

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function participantRows(entries, kind) {
  return (entries ?? []).map((entry) => ({
    ...entry,
    quantity: entry.quantity ?? 1,
    levelOrCr: kind === "party" ? entry.level ?? "—" : entry.cr ?? "—",
    hpText: entry.hp?.max > 0 ? `${entry.hp.value}/${entry.hp.max}` : "—"
  }));
}

export class EncounterCrucibleDashboard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "encounter-crucible-dashboard",
    classes: ["encounter-crucible", "encounter-crucible-dashboard"],
    tag: "section",
    window: {
      title: "EC.Dashboard.Title",
      icon: "fa-solid fa-scale-balanced",
      resizable: true
    },
    position: {
      width: 820,
      height: 760
    }
  };

  static PARTS = {
    main: {
      template: "modules/encounter-crucible/templates/dashboard.hbs"
    }
  };

  constructor({ encounter = null, api, ...options } = {}) {
    const storedPosition = readStoredPosition("dashboardPosition");
    super({ ...options, position: { ...storedPosition, ...(options.position ?? {}) } });
    this.encounter = encounter;
    this.api = api;
  }

  setEncounter(encounter) {
    this.encounter = encounter;
    return this;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const encounter = this.encounter;
    const assessment = encounter?.assessment;
    const models = assessment?.models ?? {};
    const modelRows = [
      ["rules2024", "EC.Models.Rules2024"],
      ["rules2014", "EC.Models.Rules2014"],
      ["crRatio", "EC.Models.CrRatio"],
      ["actionEconomy", "EC.Models.ActionEconomy"],
      ["resources", "EC.Models.Resources"],
      ["tactical", "EC.Models.Tactical"]
    ].map(([id, label]) => ({
      id,
      label: localize(label),
      classification: models[id]?.classification ?? "—",
      confidence: models[id] ? formatPercent(models[id].confidence) : "—",
      metrics: JSON.stringify(models[id]?.metrics ?? {}, null, 2)
    }));
    return {
      ...context,
      hasEncounter: Boolean(encounter),
      encounterName: encounter?.name ?? localize("EC.Dashboard.NoEncounter"),
      theme: encounter?.theme ?? "—",
      classification: assessment?.classification ?? "—",
      score: assessment?.score ?? "—",
      volatility: assessment?.volatility?.id ?? "—",
      confidence: assessment?.confidence?.id ?? "—",
      confidencePercent: assessment ? formatPercent(assessment.confidence.score) : "—",
      warnings: (assessment?.warnings ?? []).map((warning) => ({
        key: warning,
        label: localize(`EC.Warning.${warning}`, warning)
      })),
      models: modelRows,
      party: participantRows(encounter?.party, "party"),
      allies: participantRows(encounter?.allies, "party"),
      enemies: participantRows(encounter?.enemies, "enemy"),
      neutral: participantRows(encounter?.neutral, "enemy"),
      isGM: Boolean(globalThis.game?.user?.isGM)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    bindOwnedListeners(this, this.element, {
      actions: {
        "ec-refresh": () => this.#refresh(),
        "ec-save": () => this.#save(),
        "ec-place": () => this.#place(false),
        "ec-create-combat": () => this.#place(true),
        "ec-post-summary": () => this.#postSummary(),
        "ec-open-workshop": () => this.api.openWorkshop(this.encounter)
      }
    });
  }

  _onClose(options) {
    releaseOwnedListeners(this);
    void saveStoredPosition("dashboardPosition", this.position);
    return super._onClose(options);
  }

  async #refresh() {
    try {
      if (globalThis.game?.combat) this.encounter = await this.api.analyseCombat(globalThis.game.combat);
      else if (globalThis.canvas?.tokens?.controlled?.length) this.encounter = await this.api.analyseTokens(globalThis.canvas.tokens.controlled);
      else throw new Error(localize("EC.Error.NoCombatOrSelection"));
      await this.render({ force: true });
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }

  async #save() {
    if (!this.encounter) return;
    try {
      const journal = await this.api.saveEncounter(this.encounter);
      globalThis.ui.notifications.info(localize("EC.Notification.Saved").replace("{name}", journal.name));
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }

  async #place(createCombat) {
    if (!this.encounter) return;
    try {
      if (createCombat) await this.api.placeAndCreateCombat(this.encounter);
      else await this.api.placeEncounter(this.encounter);
      globalThis.ui.notifications.info(localize(createCombat ? "EC.Notification.CombatCreated" : "EC.Notification.Placed"));
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }

  async #postSummary() {
    if (!this.encounter?.assessment) return;
    try {
      await postEncounterSummary(this.encounter);
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }
}
