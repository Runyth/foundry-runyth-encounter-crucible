// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const moduleRoot = path.join(root, "module", "runyth-encounter-crucible");
const manifestPath = path.join(moduleRoot, "module.json");
const packagePath = path.join(root, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}

if (manifest.id !== "runyth-encounter-crucible") failures.push("manifest id is not runyth-encounter-crucible");
if (manifest.version !== packageJson.version) failures.push("manifest and package versions differ");
if (manifest.compatibility?.minimum !== "13") failures.push("Foundry minimum is not v13");
if (manifest.compatibility?.verified !== "13.351") failures.push("Foundry verified target is not 13.351");
if (!manifest.esmodules?.length) failures.push("manifest has no ES module entry point");
if (manifest.socket !== false) failures.push("module unexpectedly declares socket usage");
if (manifest.esmodules?.some((entry) => entry.includes(".."))) failures.push("manifest contains unsafe path traversal");

const references = [
  ...(manifest.esmodules ?? []),
  ...(manifest.scripts ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map((entry) => entry.path),
  ...(manifest.packs ?? []).map((entry) => entry.path)
];
for (const reference of references) {
  try {
    await access(path.join(moduleRoot, reference));
  } catch {
    failures.push(`missing manifest reference: ${reference}`);
  }
}

const languageFiles = manifest.languages.map((entry) => path.join(moduleRoot, entry.path));
const languages = await Promise.all(languageFiles.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const referenceKeys = Object.keys(languages[0]).sort();
for (let index = 1; index < languages.length; index += 1) {
  const keys = Object.keys(languages[index]).sort();
  if (JSON.stringify(keys) !== JSON.stringify(referenceKeys)) failures.push(`localisation key mismatch: ${manifest.languages[index].lang}`);
}

const templateDir = path.join(moduleRoot, "templates");
for (const entry of await readdir(templateDir)) {
  if (!entry.endsWith(".hbs")) continue;
  const content = await readFile(path.join(templateDir, entry), "utf8");
  for (const match of content.matchAll(/localize\s+["']([^"']+)["']/g)) {
    if (!(match[1] in languages[0])) failures.push(`${entry}: missing localisation key ${match[1]}`);
  }
  for (const match of content.matchAll(/data-action=["']([^"']+)["']/g)) {
    if (!match[1].startsWith("ec-")) failures.push(`${entry}: unscoped ApplicationV2 action ${match[1]}`);
  }
}

const runtimeFiles = await walk(moduleRoot);
const scriptFiles = runtimeFiles.filter((file) => file.endsWith(".js"));
for (const file of scriptFiles) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/(?:from\s+|import\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
    const referenced = path.resolve(path.dirname(file), match[1]);
    try {
      await access(referenced);
    } catch {
      failures.push(`${path.relative(moduleRoot, file)}: missing ES module import ${match[1]}`);
    }
  }
  for (const match of content.matchAll(/["']modules\/runyth-encounter-crucible\/([^"']+)["']/g)) {
    const referenced = path.join(moduleRoot, match[1]);
    try {
      await access(referenced);
    } catch {
      failures.push(`${path.relative(moduleRoot, file)}: missing runtime path modules/runyth-encounter-crucible/${match[1]}`);
    }
  }
  for (const match of content.matchAll(/localize\(["']([^"']+)["']/g)) {
    if (!match[1].includes("${") && !(match[1] in languages[0])) {
      failures.push(`${path.relative(moduleRoot, file)}: missing localisation key ${match[1]}`);
    }
  }
}

const cssPath = path.join(moduleRoot, "styles", "runyth-encounter-crucible.css");
const css = await readFile(cssPath, "utf8");
const globallyForbiddenCss = [
  /^\s*\.window-header\b/m,
  /^\s*\.window-content\b/m,
  /^\s*\.header-control\b/m,
  /^\s*\.window-title\b/m,
  /^\s*\.application\b/m,
  /^\s*\.form-group\b/m,
  /^\s*\.tabs?\b/m,
  /^\s*\.sr-only\b/m,
  /^\s*(?:button|input|select|label)\b/m
];
for (const pattern of globallyForbiddenCss) {
  if (pattern.test(css)) failures.push(`unscoped CSS selector matched ${pattern}`);
}
if (/z-index\s*:/.test(css)) failures.push("stylesheet sets z-index");
for (const line of css.split("\n")) {
  if (line.includes(".ec-") && !line.includes(".runyth-encounter-crucible .ec-")) {
    failures.push(`unscoped .ec-* selector: ${line.trim()}`);
  }
}

const constants = await readFile(path.join(moduleRoot, "scripts", "core", "constants.js"), "utf8");
if (!constants.includes(`MODULE_VERSION = "${manifest.version}"`)) failures.push("runtime module version differs from manifest");
if (!constants.includes('API_VERSION = "2.7.5"')) failures.push("public API version changed unexpectedly");
if (!constants.includes("SCHEMA_VERSION = 4")) failures.push("persistent schema changed unexpectedly");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`validation passed: ${references.length} manifest references, ${referenceKeys.length} localisation keys, ${scriptFiles.length} runtime modules`);
}
