// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { bindOwnedListeners, readStoredPosition, releaseOwnedListeners, saveStoredPosition } from "./application-lifecycle.js";
import { MODULE_ID } from "../core/constants.js";
import { actorCandidates, actorFolderOptions } from "../services/folder-service.js";
import { discoverParty } from "../services/party-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = globalThis.foundry.applications.api;
const CANDIDATE_RENDER_LIMIT = 300;

function localize(key, fallback = key) {
  return globalThis.game?.i18n?.localize?.(key) ?? fallback;
}

function stateFromEncounter(encounter = null) {
  const generation = encounter?.generation ?? {};
  return {
    name: encounter?.name ?? "",
    theme: encounter?.theme ?? "",
    target: generation.target ?? "moderate",
    folderId: null,
    folderSearch: "",
    candidateSearch: "",
    recursive: true,
    preferQuantity: generation.compositionMode === "quantity" || generation.compositionMode === "hybrid",
    preferStrength: generation.compositionMode === "strength" || generation.compositionMode === "hybrid",
    allowDuplicates: generation.allowDuplicates ?? true,
    boss: generation.boss ?? false,
    includeMinions: generation.includeMinions ?? false,
    fixedGroupSize: generation.fixedGroupSize ?? 0,
    minimumCount: generation.minimumCount ?? 1,
    maximumCount: generation.maximumCount ?? 12,
    conditions: new Set(Object.entries(encounter?.conditions ?? {}).filter(([, enabled]) => enabled).map(([id]) => id)),
    selectedCandidates: new Set((encounter?.enemies ?? []).map((entry) => entry.actorUuid).filter(Boolean))
  };
}

function updateVisibleSelections(state, formData) {
  const visible = new Set(formData.getAll("visibleCandidate").map(String));
  for (const uuid of visible) state.selectedCandidates.delete(uuid);
  for (const uuid of formData.getAll("candidate").map(String)) state.selectedCandidates.add(uuid);
}

function captureFormState(state, form) {
  if (!form) return state;
  const data = new FormData(form);
  updateVisibleSelections(state, data);
  state.name = String(data.get("name") ?? "");
  state.theme = String(data.get("theme") ?? "");
  state.target = String(data.get("target") || "moderate");
  state.folderId = String(data.get("folderId") || "") || null;
  state.folderSearch = String(data.get("folderSearch") ?? "").trim();
  state.candidateSearch = String(data.get("candidateSearch") ?? "").trim();
  state.recursive = data.get("recursive") === "on";
  state.preferQuantity = data.get("preferQuantity") === "on";
  state.preferStrength = data.get("preferStrength") === "on";
  state.allowDuplicates = data.get("allowDuplicates") === "on";
  state.boss = data.get("boss") === "on";
  state.includeMinions = data.get("includeMinions") === "on";
  state.fixedGroupSize = Number(data.get("fixedGroupSize") || 0);
  state.minimumCount = Number(data.get("minimumCount") || 1);
  state.maximumCount = Number(data.get("maximumCount") || 12);
  state.conditions = new Set(data.getAll("condition").map(String));
  return state;
}

export class EncounterCrucibleWorkshop extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "runyth-encounter-crucible-workshop",
    classes: ["runyth-encounter-crucible", "runyth-encounter-crucible-workshop"],
    tag: "section",
    window: {
      title: "EC.Workshop.Title",
      icon: "fa-solid fa-hammer",
      resizable: true
    },
    position: {
      width: 920,
      height: 800
    }
  };

  static PARTS = {
    main: {
      template: "modules/runyth-encounter-crucible/templates/workshop.hbs"
    }
  };

  constructor({ encounter = null, api, ...options } = {}) {
    const storedPosition = readStoredPosition("workshopPosition");
    super({ ...options, position: { ...storedPosition, ...(options.position ?? {}) } });
    this.api = api ?? globalThis.game?.modules?.get(MODULE_ID)?.api;
    this.generated = encounter;
    this.formState = stateFromEncounter(encounter);
    this.generation = { active: false, progress: null };
    this.generationController = null;
    this.isClosing = false;
  }

  setEncounter(encounter = null) {
    this.generated = encounter;
    this.formState = stateFromEncounter(encounter);
    return this;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const state = this.formState;
    const folderQuery = state.folderSearch.toLocaleLowerCase();
    const allFolders = actorFolderOptions();
    const folders = allFolders
      .filter((folder) => !folderQuery || folder.id === state.folderId || folder.name.toLocaleLowerCase().includes(folderQuery))
      .map((folder) => ({ ...folder, selected: folder.id === state.folderId }));
    const party = this.generated?.party?.length ? this.generated.party : discoverParty();
    const candidateQuery = state.candidateSearch.toLocaleLowerCase();
    const allCandidates = actorCandidates(state.folderId, state.recursive)
      .sort((left, right) => (left.cr ?? 0) - (right.cr ?? 0) || left.name.localeCompare(right.name));
    const matchingCandidates = allCandidates.filter((candidate) => {
      if (!candidateQuery) return true;
      return candidate.name.toLocaleLowerCase().includes(candidateQuery)
        || String(candidate.cr ?? "").toLocaleLowerCase().includes(candidateQuery);
    });
    const candidates = matchingCandidates
      .slice(0, CANDIDATE_RENDER_LIMIT)
      .map((candidate) => ({
        ...candidate,
        crText: candidate.cr ?? "—",
        selected: state.selectedCandidates.has(candidate.actorUuid)
      }));
    const targetOptions = ["trivial", "low", "moderate", "high", "extreme"].map((id) => ({
      id,
      label: localize(`EC.Difficulty.${id[0].toUpperCase()}${id.slice(1)}`),
      selected: id === state.target
    }));
    const tacticalConditions = [
      "partySurprised",
      "enemiesSurprised",
      "enemyPrepared",
      "partyPrepared",
      "enemyHighGround",
      "partyHighGround",
      "enemyChokePoint",
      "partyChokePoint",
      "noRetreat",
      "protectObjective",
      "timedObjective",
      "hazardousTerrain",
      "enemyReinforcements",
      "partyReinforcements",
      "poorVisibilityForParty",
      "poorVisibilityForEnemies"
    ].map((id) => ({
      id,
      label: localize(`EC.Condition.${id}`),
      selected: state.conditions.has(id)
    }));
    return {
      ...context,
      folders,
      folderCount: allFolders.length,
      folderSearch: state.folderSearch,
      party,
      candidates,
      candidateSearch: state.candidateSearch,
      candidateCount: allCandidates.length,
      matchingCandidateCount: matchingCandidates.length,
      selectedCandidateCount: state.selectedCandidates.size,
      candidateLimit: CANDIDATE_RENDER_LIMIT,
      candidateLimitReached: matchingCandidates.length > CANDIDATE_RENDER_LIMIT,
      targetOptions,
      tacticalConditions,
      name: state.name,
      theme: state.theme,
      preferQuantity: state.preferQuantity,
      preferStrength: state.preferStrength,
      allowDuplicates: state.allowDuplicates,
      boss: state.boss,
      includeMinions: state.includeMinions,
      fixedGroupSize: state.fixedGroupSize,
      minimumCount: state.minimumCount,
      maximumCount: state.maximumCount,
      generated: this.generated,
      generatedEnemies: this.generated?.enemies ?? [],
      generatedAssessment: this.generated?.assessment ?? null,
      recursive: state.recursive,
      generating: this.generation.active,
      generationProgress: this.generation.progress,
      generationPercent: this.generation.progress?.maximumDepth
        ? Math.round((this.generation.progress.depth / this.generation.progress.maximumDepth) * 100)
        : 0,
      isGM: Boolean(globalThis.game?.user?.isGM)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.isClosing = false;
    bindOwnedListeners(this, this.element, {
      actions: {
        "ec-apply-filters": (_event, target) => {
          captureFormState(this.formState, target.closest("form"));
          return this.render({ force: true });
        },
        "ec-clear-filters": (_event, target) => {
          captureFormState(this.formState, target.closest("form"));
          this.formState.folderSearch = "";
          this.formState.candidateSearch = "";
          return this.render({ force: true });
        },
        "ec-save": () => this.#save(),
        "ec-place": () => this.#place(false),
        "ec-create-combat": () => this.#place(true),
        "ec-open-dashboard": () => this.api.openDashboard(this.generated),
        "ec-cancel-generation": () => this.#cancelGeneration()
      },
      changes: {
        '[name="folderId"]': (_event, target) => {
          captureFormState(this.formState, target.closest("form"));
          return this.render({ force: true });
        },
        '[name="recursive"]': (_event, target) => {
          captureFormState(this.formState, target.closest("form"));
          return this.render({ force: true });
        }
      },
      keydowns: {
        '[name="folderSearch"], [name="candidateSearch"]': (event, target) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          captureFormState(this.formState, target.closest("form"));
          return this.render({ force: true });
        }
      },
      submit: (_event, form) => this.#generate(form)
    });
  }

  _onClose(options) {
    this.isClosing = true;
    this.#cancelGeneration();
    releaseOwnedListeners(this);
    void saveStoredPosition("workshopPosition", this.position);
    return super._onClose(options);
  }

  #cancelGeneration() {
    this.generationController?.abort();
  }

  #updateGenerationProgress(progress) {
    this.generation.progress = progress;
    const root = this.element;
    const meter = root?.querySelector?.("[data-ec-generation-progress]");
    const label = root?.querySelector?.("[data-ec-generation-status]");
    if (meter) {
      meter.max = Math.max(1, Number(progress.maximumDepth) || 1);
      meter.value = Math.max(0, Number(progress.depth) || 0);
    }
    if (label) {
      label.textContent = localize("EC.Workshop.GenerationProgress")
        .replace("{current}", String(progress.depth ?? 0))
        .replace("{maximum}", String(progress.maximumDepth ?? 0));
    }
  }

  async #generate(form) {
    captureFormState(this.formState, form);
    const selectedUuids = new Set(this.formState.selectedCandidates);
    const sourceCandidates = actorCandidates(this.formState.folderId, this.formState.recursive);
    const selectedPool = selectedUuids.size ? actorCandidates(null, true) : sourceCandidates;
    const candidates = selectedUuids.size
      ? selectedPool.filter((candidate) => selectedUuids.has(candidate.actorUuid))
      : sourceCandidates;
    const party = discoverParty();
    const conditions = Object.fromEntries([...this.formState.conditions].map((id) => [id, true]));
    const input = {
      name: this.formState.name || localize("EC.Workshop.DefaultName"),
      theme: this.formState.theme || "Generated",
      party,
      candidates,
      conditions,
      target: this.formState.target,
      preferQuantity: this.formState.preferQuantity,
      preferStrength: this.formState.preferStrength,
      fixedGroupSize: this.formState.fixedGroupSize,
      minimumCount: this.formState.minimumCount,
      maximumCount: this.formState.maximumCount,
      allowDuplicates: this.formState.allowDuplicates,
      boss: this.formState.boss,
      includeMinions: this.formState.includeMinions
    };

    this.generationController?.abort();
    const controller = new AbortController();
    this.generationController = controller;
    this.generation = { active: true, progress: { depth: 0, maximumDepth: Math.max(1, this.formState.fixedGroupSize || this.formState.maximumCount) } };
    await this.render({ force: true });

    try {
      const generated = await this.api.generateEncounterAsync(input, {
        signal: controller.signal,
        onProgress: (progress) => this.#updateGenerationProgress(progress)
      });
      if (controller.signal.aborted) return;
      this.generated = generated;
      await this.api.analyseDefinition(this.generated, { reuseAssessment: true });
    } catch (error) {
      if (error?.name !== "AbortError") globalThis.ui.notifications.error(error.message);
    } finally {
      if (this.generationController === controller) {
        this.generationController = null;
        this.generation = { active: false, progress: null };
        if (this.rendered && !this.isClosing) await this.render({ force: true });
      }
    }
  }

  async #save() {
    if (!this.generated) return;
    try {
      const journal = await this.api.saveEncounter(this.generated);
      globalThis.ui.notifications.info(localize("EC.Notification.Saved").replace("{name}", journal.name));
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }

  async #place(createCombat) {
    if (!this.generated) return;
    try {
      if (createCombat) await this.api.placeAndCreateCombat(this.generated);
      else await this.api.placeEncounter(this.generated);
      globalThis.ui.notifications.info(localize(createCombat ? "EC.Notification.CombatCreated" : "EC.Notification.Placed"));
    } catch (error) {
      globalThis.ui.notifications.error(error.message);
    }
  }
}

export class EncounterCrucibleSettingsLauncher extends EncounterCrucibleWorkshop {
  static DEFAULT_OPTIONS = {
    id: "runyth-encounter-crucible-settings-workshop",
    classes: ["runyth-encounter-crucible", "runyth-encounter-crucible-workshop", "runyth-encounter-crucible-settings-workshop"]
  };

  constructor(options = {}) {
    super({ api: globalThis.game?.modules?.get(MODULE_ID)?.api, ...options });
  }
}
