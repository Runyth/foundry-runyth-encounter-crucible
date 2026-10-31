// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { MODULE_ID } from "../core/constants.js";

const TOOL_ID = "encounter-crucible";
let sceneControlsHookId = null;

function nextOrder(tools) {
  return Math.max(-1, ...Object.values(tools).map((tool) => Number(tool?.order)).filter(Number.isFinite)) + 1;
}

export function upsertSceneControlTool(controls, openWorkshop) {
  const tokenControls = controls?.tokens;
  const tools = tokenControls?.tools;
  if (!tokenControls || !tools || Array.isArray(tools) || typeof tools !== "object") return false;
  if (tools[TOOL_ID]) return false;

  tools[TOOL_ID] = {
    name: TOOL_ID,
    title: "EC.Controls.Open",
    icon: "fa-solid fa-scale-balanced",
    order: nextOrder(tools),
    button: true,
    visible: Boolean(globalThis.game?.user?.isGM),
    onChange: () => openWorkshop()
  };
  return true;
}

export function registerSceneControlsIntegration(openWorkshop) {
  if (sceneControlsHookId !== null) return sceneControlsHookId;
  sceneControlsHookId = globalThis.Hooks.on("getSceneControlButtons", (controls) => {
    try {
      upsertSceneControlTool(controls, openWorkshop);
    } catch (error) {
      console.error(`[${MODULE_ID}] Scene Controls integration failed.`, error);
    }
  });
  return sceneControlsHookId;
}
