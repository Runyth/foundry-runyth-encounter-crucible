// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const NAMED_IMPORT = /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["'];?/g;
const SIDE_EFFECT_IMPORT = /import\s*["']([^"']+)["'];?/g;

function normalizeId(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function resolveImport(moduleId, specifier) {
  if (!specifier.startsWith(".")) {
    throw new Error(`Encounter Crucible runtime bundler only accepts relative imports: ${moduleId} -> ${specifier}`);
  }
  return normalizeId(path.posix.normalize(path.posix.join(path.posix.dirname(moduleId), specifier)));
}

function exportedNames(source) {
  const names = new Set();
  const patterns = [
    /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+class\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  if (/\bexport\s+(?:default|\{)/.test(source)) {
    throw new Error("Encounter Crucible runtime bundler does not support default exports or export lists.");
  }
  return [...names];
}

function transformModule(moduleId, source) {
  const imports = [];
  let transformed = source.replace(NAMED_IMPORT, (_match, bindings, specifier) => {
    const resolved = resolveImport(moduleId, specifier);
    imports.push(resolved);
    const normalizedBindings = bindings
      .split(",")
      .map((binding) => binding.trim())
      .filter(Boolean)
      .join(", ");
    return `const { ${normalizedBindings} } = __require(${JSON.stringify(resolved)});`;
  });
  transformed = transformed.replace(SIDE_EFFECT_IMPORT, (_match, specifier) => {
    const resolved = resolveImport(moduleId, specifier);
    imports.push(resolved);
    return `__require(${JSON.stringify(resolved)});`;
  });
  const exports = exportedNames(source);
  transformed = transformed.replace(/\bexport\s+(?=(?:async\s+)?function\b|class\b|(?:const|let|var)\b)/g, "");
  if (/\b(?:import|export)\s/.test(transformed)) {
    throw new Error(`Unsupported ESM syntax remains after bundling ${moduleId}.`);
  }
  if (exports.length) transformed += `\nObject.assign(exports, { ${exports.join(", ")} });\n`;
  return { transformed, imports };
}

export async function bundleEntry({ sourceRoot, entry, destination, banner = "" }) {
  const root = path.resolve(sourceRoot);
  const entryId = normalizeId(entry);
  const modules = new Map();

  async function collect(moduleId) {
    if (modules.has(moduleId)) return;
    const file = path.join(root, ...moduleId.split("/"));
    const source = await readFile(file, "utf8");
    const record = transformModule(moduleId, source);
    modules.set(moduleId, record);
    await Promise.all(record.imports.map((dependency) => collect(dependency)));
  }

  await collect(entryId);
  const factories = [...modules.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, { transformed }]) => `${JSON.stringify(id)}: (module, exports, __require) => {\n${transformed}\n}`)
    .join(",\n");

  const output = `${banner ? `${banner.trim()}\n` : ""}// Generated deterministically from modular Encounter Crucible source.\nconst __ecModules = {\n${factories}\n};\nconst __ecCache = new Map();\nfunction __ecRequire(id) {\n  if (__ecCache.has(id)) return __ecCache.get(id).exports;\n  const factory = __ecModules[id];\n  if (!factory) throw new Error(\`Encounter Crucible bundled module not found: \${id}\`);\n  const module = { exports: {} };\n  __ecCache.set(id, module);\n  factory(module, module.exports, __ecRequire);\n  return module.exports;\n}\n__ecRequire(${JSON.stringify(entryId)});\n`;

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, output, { encoding: "utf8", newline: "\n" });
  return { moduleCount: modules.size, bytes: Buffer.byteLength(output), entry: entryId };
}
