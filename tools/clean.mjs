// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
import { rm } from "node:fs/promises";

await Promise.all([
  rm(new URL("../build", import.meta.url), { recursive: true, force: true }),
  rm(new URL("../dist", import.meta.url), { recursive: true, force: true })
]);
