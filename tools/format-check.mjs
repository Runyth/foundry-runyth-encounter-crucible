// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const ignored = new Set([".git", "build", "dist", "node_modules"]);
const textExtensions = new Set([".js", ".mjs", ".json", ".md", ".css", ".hbs", ".yml", ".yaml", ".py", ".editorconfig", ".gitignore"]);
const failures = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (textExtensions.has(path.extname(entry.name)) || entry.name.startsWith(".")) {
      const content = await readFile(target, "utf8");
      const relative = path.relative(root, target);
      if (content.includes("\r")) failures.push(`${relative}: contains CRLF or CR characters`);
      if (!content.endsWith("\n")) failures.push(`${relative}: missing final newline`);
      content.split("\n").forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`${relative}:${index + 1}: trailing whitespace`);
      });
    }
  }
}

await walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("format check passed");
}
