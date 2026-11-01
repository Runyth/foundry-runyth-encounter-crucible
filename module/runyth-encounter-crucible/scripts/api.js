// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { aggregateAssessment } from "./core/calculations.js";
import { API_VERSION, ASSESS_ENCOUNTER_CAPABILITY_VERSION, COLLECT_ACTORS_CAPABILITY_VERSION, ENCOUNTER_GENERATION_CAPABILITY_VERSION, MODULE_ID, MODULE_VERSION, SCHEMA_VERSION } from "./core/constants.js";
import { assertVersion, satisfiesVersion } from "./core/version.js";
import { createHelperModuleRegistry } from "./core/helper-registry.js";
import { createCapabilityCatalog } from "./core/capability-catalog.js";
import { createEncounterDefinition, generateEncounter, resolveCompositionMode, targetBudgetForDifficulty } from "./core/encounter.js";
import { generateEncounterAsync } from "./services/generation-service.js";
import { requireCurrentUserGM } from "./core/permissions.js";
import { normalizeActor, normalizeToken, normalizeUuid } from "./services/actor-normalizer.js";
import { encounterFromCombat, encounterFromTokens } from "./services/combat-service.js";
import { actorCandidates, actorsInFolder, descendantActorFolders } from "./services/folder-service.js";
import { discoverParty, discoverPartyActors } from "./services/party-service.js";
import { encounterFromJournal, listSavedEncounters, saveEncounter } from "./services/persistence-service.js";
import { createCombatFromTokens, placeAndCreateCombat, placeEncounter } from "./services/placement-service.js";

export function createApi({ openDashboard, openWorkshop, rememberEncounter, lifecycle = null }) {
  const reservedModelIds = new Set(["rules2024", "rules2014", "crRatio", "actionEconomy", "resources", "tactical"]);
  const models = new Map();
  const systemAdapters = new Map();
  const resourceProviders = new Map();
  const helperModules = createHelperModuleRegistry({
    onRegister(descriptor, previous) {
      globalThis.Hooks?.callAll?.("encounterCrucibleHelperRegistered", descriptor, previous);
    },
    onUnregister(descriptor) {
      globalThis.Hooks?.callAll?.("encounterCrucibleHelperUnregistered", descriptor);
    }
  });

  function registerUnique(registry, entry, kind) {
    if (!entry?.id || typeof entry.id !== "string") throw new TypeError(`${kind} requires a stable string id.`);
    if (registry === models && reservedModelIds.has(entry.id)) {
      throw new Error(`${kind} '${entry.id}' conflicts with a built-in model.`);
    }
    if (registry.has(entry.id)) throw new Error(`${kind} '${entry.id}' is already registered.`);
    registry.set(entry.id, entry);
    return entry;
  }

  async function analyseDefinition(encounter, options = {}) {
    const includeCurrentResources = options.includeCurrentResources
      ?? globalThis.game?.settings?.get?.(MODULE_ID, "includeCurrentResources")
      ?? true;
    const normalizeResourceState = (entry) => includeCurrentResources
      ? entry
      : {
          ...entry,
          hp: entry.hp?.max > 0 ? { ...entry.hp, value: entry.hp.max } : entry.hp,
          spellRatio: 1,
          resourceRatio: 1
        };
    const { assessment: _previousAssessment, ...encounterData } = encounter;
    const context = {
      ...encounterData,
      party: [...(encounter.party ?? []), ...(encounter.allies ?? [])].map(normalizeResourceState)
    };
    const assessment = options.reuseAssessment && encounter.assessment
      ? encounter.assessment
      : aggregateAssessment(context, options);
    encounter.assessment = assessment;
    encounter.updatedAt = new Date().toISOString();

    if (options.extensionModels !== false && models.size) {
      const entries = [...models.entries()];
      const results = await Promise.all(entries.map(async ([id, model]) => {
        if (model.supports && !await model.supports(context, options)) return { id, supported: false };
        return { id, supported: true, result: await model.calculate(context, options) };
      }).map((promise) => promise.catch((error) => ({ error }))));
      for (let index = 0; index < entries.length; index += 1) {
        const [id] = entries[index];
        const outcome = results[index];
        if (outcome?.error) {
          assessment.warnings.push(`extension-model-failed:${id}`);
          console.error(`[${MODULE_ID}] Extension model '${id}' failed.`, outcome.error);
        } else if (outcome?.supported) {
          assessment.models[id] = outcome.result;
        }
      }
    }

    if (options.remember !== false) {
      try {
        await rememberEncounter?.(encounter);
      } catch (error) {
        assessment.warnings.push("remember-encounter-failed");
        console.error(`[${MODULE_ID}] Could not remember the last encounter.`, error);
      }
    }
    if (options.emitHooks !== false) {
      globalThis.Hooks?.callAll?.("encounterCrucibleAfterAnalyse", assessment, encounter);
    }
    return assessment;
  }

  function privileged(action, callback) {
    return (...args) => {
      requireCurrentUserGM(action);
      return callback(...args);
    };
  }

  const browseNpcCandidates = privileged("browse NPC encounter candidates", actorCandidates);
  const browseActorsInFolder = privileged("browse Actor folders", actorsInFolder);
  const browseDescendantActorFolders = privileged("browse Actor folders", descendantActorFolders);
  const browseSavedEncounters = privileged("list saved encounters", listSavedEncounters);

  function normalizeCollectActorOptions(input, recursive = true) {
    if (typeof input === "string" || input == null) {
      return { folderId: input ?? null, recursive, normalized: false };
    }
    if (Array.isArray(input)) return { actors: input, recursive, normalized: false };
    if (typeof input !== "object") throw new TypeError("collectActors options must be a folder id, Actor array, or options object.");
    return { ...input, recursive: input.recursive ?? recursive };
  }

  function collectActors(input = null, recursive = true) {
    requireCurrentUserGM("collect world Actors");
    const options = normalizeCollectActorOptions(input, recursive);
    const requestedTypes = options.types ?? options.actorTypes ?? (options.type ? [options.type] : null);
    const types = requestedTypes == null
      ? null
      : new Set((Array.isArray(requestedTypes) ? requestedTypes : [requestedTypes]).map((value) => String(value)));
    const sourceActors = Array.isArray(options.actors)
      ? options.actors
      : options.folderId
        ? actorsInFolder(options.folderId, options.recursive !== false)
        : (globalThis.game?.actors?.contents ?? []);
    const actors = sourceActors.filter((actor) => actor && (!types || types.has(String(actor.type))));
    if (options.normalized !== true && options.normalize !== true) return [...actors];
    const side = options.side ?? "enemy";
    const contribution = options.contribution ?? 1;
    return actors.map((actor) => normalizeActor(actor, { side, contribution }));
  }

  function assessEncounter(encounter, options = {}) {
    if (!encounter || typeof encounter !== "object") throw new TypeError("assessEncounter requires an encounter definition.");
    return analyseDefinition(encounter, { remember: false, emitHooks: false, ...options });
  }

  function decorateCapability(fn, id, version) {
    Object.assign(fn, {
      id,
      capability: id,
      available: true,
      version,
      capabilityVersion: version,
      supports(requirement) {
        return satisfiesVersion(version, requirement);
      },
      assertVersion(requirement) {
        return assertVersion(version, requirement, `Runyth Encounter Crucible ${id} capability`);
      }
    });
    return Object.freeze(fn);
  }

  decorateCapability(collectActors, "collectActors", COLLECT_ACTORS_CAPABILITY_VERSION);
  decorateCapability(assessEncounter, "assessEncounter", ASSESS_ENCOUNTER_CAPABILITY_VERSION);

  function encounterGeneration(input, runtimeOptions) {
    return generateEncounterAsync(input, runtimeOptions);
  }
  Object.assign(encounterGeneration, {
    id: "encounterGeneration",
    capability: "encounterGeneration",
    available: true,
    version: ENCOUNTER_GENERATION_CAPABILITY_VERSION,
    capabilityVersion: ENCOUNTER_GENERATION_CAPABILITY_VERSION,
    createEncounterDefinition,
    resolveCompositionMode,
    targetBudgetForDifficulty,
    generate: generateEncounterAsync,
    generateAsync: generateEncounterAsync,
    generateSync: generateEncounter,
    generateEncounter,
    generateEncounterAsync,
    normalizeActor,
    normalizeToken,
    normalizeUuid,
    discoverParty,
    discoverPartyActors,
    actorCandidates: browseNpcCandidates,
    actorsInFolder: browseActorsInFolder,
    descendantActorFolders: browseDescendantActorFolders,
    collectActors,
    assessEncounter,
    analyseDefinition,
    saveEncounter,
    encounterFromJournal,
    listSavedEncounters: browseSavedEncounters,
    placeEncounter,
    createCombatFromTokens,
    placeAndCreateCombat,
    supports(requirement) {
      return satisfiesVersion(ENCOUNTER_GENERATION_CAPABILITY_VERSION, requirement);
    },
    assertVersion(requirement) {
      return assertVersion(ENCOUNTER_GENERATION_CAPABILITY_VERSION, requirement, "Runyth Encounter Crucible encounterGeneration capability");
    }
  });
  Object.freeze(encounterGeneration);
  const capabilityCatalog = createCapabilityCatalog({
    encounterGeneration: { version: ENCOUNTER_GENERATION_CAPABILITY_VERSION, api: encounterGeneration },
    collectActors: { version: COLLECT_ACTORS_CAPABILITY_VERSION, api: collectActors },
    assessEncounter: { version: ASSESS_ENCOUNTER_CAPABILITY_VERSION, api: assessEncounter },
    helperModuleRegistry: { version: helperModules.version, api: helperModules }
  });
  const supportedCapabilities = capabilityCatalog.names;
  const capabilityMap = capabilityCatalog.map;
  const featureMap = capabilityCatalog.features;
  const capabilityVersions = capabilityCatalog.versions;
  const capabilityDescriptors = capabilityCatalog.descriptors;
  const helperApi = Object.freeze({
    version: API_VERSION,
    apiVersion: API_VERSION,
    moduleVersion: MODULE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    capabilities: supportedCapabilities,
    supportedCapabilities,
    capabilityMap,
    capabilityVersions,
    capabilityDescriptors,
    features: featureMap,
    encounterGeneration,
    collectActors,
    assessEncounter,
    helperModuleRegistry: helperModules,
    helperModules,
    helpers: helperModules,
    registerHelperModule: helperModules.register,
    registerHelper: helperModules.register
  });
  const compatibility = Object.freeze({
    moduleId: MODULE_ID,
    moduleVersion: MODULE_VERSION,
    apiVersion: API_VERSION,
    helperApiVersion: API_VERSION,
    schemaVersion: SCHEMA_VERSION,
    capabilities: supportedCapabilities,
    capabilityMap,
    capabilityVersions,
    capabilityDescriptors,
    helperRegistryVersion: helperModules.version
  });

  let publicApi;
  publicApi = {
    version: API_VERSION,
    apiVersion: API_VERSION,
    helperApiVersion: API_VERSION,
    helperAPIVersion: API_VERSION,
    helperVersion: API_VERSION,
    API_VERSION,
    HELPER_API_VERSION: API_VERSION,
    moduleVersion: MODULE_VERSION,
    coreVersion: MODULE_VERSION,
    MODULE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    helperApi,
    helperAPI: helperApi,
    compatibility,
    capabilities: supportedCapabilities,
    supportedCapabilities,
    capabilityMap,
    capabilityVersions,
    capabilityDescriptors,
    features: featureMap,
    encounterGeneration,
    collectActors,
    assessEncounter,
    helperModules,
    helperRegistry: helperModules,
    helpers: helperModules,
    registerHelperModule: helperModules.register,
    registerHelper: helperModules.register,
    unregisterHelperModule: helperModules.unregister,
    unregisterHelper: helperModules.unregister,
    getHelperModule: helperModules.get,
    getHelper: helperModules.get,
    hasHelperModule: helperModules.has,
    hasHelper: helperModules.has,
    listHelperModules: helperModules.list,
    listHelpers: helperModules.list,
    hasCapability(capability, requirement = null) {
      return capabilityCatalog.has(capability, requirement);
    },
    getCapability(capability) {
      return capabilityCatalog.get(capability);
    },
    getCapabilityDescriptor(capability) {
      return capabilityCatalog.getDescriptor(capability);
    },
    getCapabilityVersion(capability) {
      return capabilityCatalog.getDescriptor(capability)?.version ?? null;
    },
    assertCapability(capability, requirement = null) {
      return capabilityCatalog.assert(capability, requirement);
    },
    get isReady() {
      return lifecycle?.isReady ?? true;
    },
    whenReady() {
      return lifecycle?.whenReady?.().then(() => publicApi) ?? Promise.resolve(publicApi);
    },
    getCompatibility() {
      return { ...compatibility };
    },
    isApiVersionSupported(requirement) {
      return satisfiesVersion(API_VERSION, requirement);
    },
    assertApiVersion(requirement) {
      return assertVersion(API_VERSION, requirement, "Runyth Encounter Crucible Helper API");
    },
    isModuleVersionSupported(requirement) {
      return satisfiesVersion(MODULE_VERSION, requirement);
    },
    assertModuleVersion(requirement) {
      return assertVersion(MODULE_VERSION, requirement, "Runyth Encounter Crucible");
    },
    normalizeActor,
    normalizeToken,
    normalizeUuid,
    discoverParty,
    discoverPartyActors,
    actorCandidates: browseNpcCandidates,
    actorsInFolder: browseActorsInFolder,
    descendantActorFolders: browseDescendantActorFolders,
    createEncounterDefinition,
    resolveCompositionMode,
    targetBudgetForDifficulty,
    generateEncounter,
    generateEncounterAsync,
    async analyseCombat(combat = globalThis.game?.combat, options = {}) {
      requireCurrentUserGM("analyse the active Combat");
      if (options.emitHooks !== false) {
        const allowed = globalThis.Hooks?.call?.("encounterCrucibleBeforeAnalyse", combat, options);
        if (allowed === false) throw new Error("Encounter analysis was cancelled by an integration hook.");
      }
      const encounter = encounterFromCombat(combat, {
        includeDefeated: options.includeDefeated ?? globalThis.game.settings.get(MODULE_ID, "includeDefeatedCombatants"),
        ...options
      });
      await analyseDefinition(encounter, options);
      return encounter;
    },
    async analyseTokens(tokens = globalThis.canvas?.tokens?.controlled ?? [], options = {}) {
      requireCurrentUserGM("analyse selected Tokens");
      const encounter = encounterFromTokens(tokens, options);
      await analyseDefinition(encounter, options);
      return encounter;
    },
    analyseDefinition,
    saveEncounter,
    encounterFromJournal,
    listSavedEncounters: browseSavedEncounters,
    placeEncounter,
    createCombatFromTokens,
    placeAndCreateCombat,
    openDashboard,
    openWorkshop,
    registerModel(model) {
      return registerUnique(models, model, "Encounter model");
    },
    unregisterModel(id) {
      return models.delete(id);
    },
    listModels() {
      return [...models.values()];
    },
    registerSystemAdapter(adapter) {
      return registerUnique(systemAdapters, adapter, "System adapter");
    },
    getSystemAdapter(id = globalThis.game?.system?.id) {
      return systemAdapters.get(id) ?? null;
    },
    registerResourceProvider(provider) {
      return registerUnique(resourceProviders, provider, "Resource provider");
    },
    listResourceProviders() {
      return [...resourceProviders.values()];
    }
  };
  return Object.freeze(publicApi);
}
