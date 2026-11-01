// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const runtime = path.join(root, "module", "runyth-encounter-crucible");
const ignored = new Set([".git", "build", "dist", "node_modules", "coverage"]);
const sourceFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if ([".js", ".mjs"].includes(path.extname(entry.name))) sourceFiles.push(target);
  }
}

await walk(root);
for (const file of sourceFiles) execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });

const banned = [
  [/extends\s+FormApplication\b/, "legacy FormApplication inheritance"],
  [/extends\s+Application\b(?!V2)/, "legacy Application inheritance"],
  [/\bFormDataExtended\b/, "deprecated FormDataExtended global"],
  [/Hooks\.on\(["']renderApplication(?:V2)?["']/, "broad Application render hook"],
  [/Hooks\.on\(["']render(?:Actor|Item)Sheet["']/, "broad sheet render hook"],
  [/Hooks\.on\(["']renderTokenHUD["']/, "Token HUD hook is outside the accepted integration surface"],
  [/Hooks\.on\(["']renderChatMessage["']/, "deprecated renderChatMessage hook"],
  [/\bhtml\.(?:find|on|data|attr)\s*\(/, "jQuery-style render-hook handling"],
  [/\bjQuery\s*\(/, "jQuery use"],
  [/(^|[^\w$])\$\s*\(/m, "jQuery dollar use"],
  [/\bcontrols\.push\s*\(/, "array-shaped Scene Controls mutation"],
  [/document\.addEventListener\(["']key(?:down|up|press)["']/, "raw global keyboard listener"],
  [/\bloadTemplates\s*\(/, "deprecated loadTemplates global"],
  [/\brenderTemplate\s*\(/, "deprecated renderTemplate global"],
  [/globalThis\.(?:Folder|JournalEntry|Combat|ChatMessage)\b/, "deprecated global Document class"],
  [/\bnew\s+(?:Folder|JournalEntry|Combat|ChatMessage)\b/, "direct global Document construction"]
];

const failures = [];
const runtimeFiles = sourceFiles.filter((file) => file.startsWith(runtime));
for (const file of runtimeFiles) {
  const content = await readFile(file, "utf8");
  for (const [pattern, message] of banned) {
    if (pattern.test(content)) failures.push(`${path.relative(root, file)}: ${message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`lint passed: ${sourceFiles.length} JavaScript files; compatibility bans satisfied`);
}
