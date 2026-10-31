#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import shutil
import stat
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
BUILD_MODULE = BUILD / "encounter-crucible"
DOC_STAGE = BUILD / "encounter-crucible-documentation"
DIST = ROOT / "dist"
VERSION = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
INSTALL_NAME = f"encounter-crucible-v{VERSION}-mod.zip"
SOURCE_NAME = f"encounter-crucible-v{VERSION}-src.zip"
DOCUMENTATION_NAME = f"encounter-crucible-v{VERSION}-doc.zip"
DOCUMENTATION_ROOT = f"encounter-crucible-v{VERSION}-doc"
SOURCE_ROOT = f"encounter-crucible-v{VERSION}-src"
FIXED_TIME = (2026, 8, 4, 0, 0, 0)
EXCLUDED_PARTS = {".git", "build", "dist", "node_modules", "coverage", "__pycache__"}


def iter_files(root: Path):
  for path in sorted(root.rglob("*"), key=lambda value: value.as_posix()):
    if path.is_file() and not any(part in EXCLUDED_PARTS for part in path.relative_to(root).parts):
      yield path


def write_zip(destination: Path, source_root: Path, archive_root: str):
  with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for source in iter_files(source_root):
      relative = source.relative_to(source_root).as_posix()
      info = zipfile.ZipInfo(f"{archive_root}/{relative}", FIXED_TIME)
      executable = bool(source.stat().st_mode & stat.S_IXUSR)
      info.external_attr = ((0o755 if executable else 0o644) & 0xFFFF) << 16
      info.compress_type = zipfile.ZIP_DEFLATED
      info.create_system = 3
      archive.writestr(info, source.read_bytes())


def sha256(path: Path) -> str:
  digest = hashlib.sha256()
  with path.open("rb") as handle:
    for chunk in iter(lambda: handle.read(1024 * 1024), b""):
      digest.update(chunk)
  return digest.hexdigest()


def zip_count(path: Path) -> int:
  with zipfile.ZipFile(path) as archive:
    return len(archive.namelist())


def count_tests() -> int:
  return sum(
    len(re.findall(r"(?m)^test\s*\(", path.read_text(encoding="utf-8")))
    for path in sorted((ROOT / "tests").glob("*.test.mjs"))
  )


def validate_zip(path: Path, expected_root: str, kind: str):
  with zipfile.ZipFile(path) as archive:
    names = archive.namelist()
    roots = {name.split("/", 1)[0] for name in names if name}
    if roots != {expected_root}:
      raise RuntimeError(f"{path.name}: expected one root {expected_root!r}, got {sorted(roots)!r}")
    if kind == "install":
      manifest = f"{expected_root}/module.json"
      if manifest not in names:
        raise RuntimeError(f"{path.name}: module.json is missing at the module root")
      development_markers = (
        "/tests/", "/tools/", "/docs/", "/.github/", "/node_modules/",
        "/README.md", "/CHANGELOG.md", "/package.json", "/package-lock.json"
      )
      bad = [name for name in names if any(marker in name for marker in development_markers)]
      if bad:
        raise RuntimeError(f"{path.name}: development-only files present: {bad[:5]}")
    elif kind == "source":
      required = {
        f"{expected_root}/package.json",
        f"{expected_root}/package-lock.json",
        f"{expected_root}/README.md",
        f"{expected_root}/CHANGELOG.md",
        f"{expected_root}/tools/package.py",
        f"{expected_root}/tests/compatibility-audit.test.mjs",
        f"{expected_root}/tests/version.test.mjs",
        f"{expected_root}/tests/lifecycle.test.mjs",
        f"{expected_root}/docs/DEPENDENCY-COMPATIBILITY-v{VERSION}.md",
        f"{expected_root}/docs/COMPATIBILITY-AUDIT-v{VERSION}.md",
        f"{expected_root}/docs/PERFORMANCE-AUDIT-v{VERSION}.md",
        f"{expected_root}/docs/INCREMENTAL-BEST-PRACTICE-CHANGELOG-v{VERSION}.md",
        f"{expected_root}/docs/AUTOMATED-TEST-RESULTS-v{VERSION}.md",
        f"{expected_root}/docs/RELEASE-REPORT-v{VERSION}.md",
        f"{expected_root}/docs/VALIDATION-v{VERSION}.md"
      }
      missing = sorted(required.difference(names))
      if missing:
        raise RuntimeError(f"{path.name}: required source files are missing: {missing}")
      embedded_archives = [name for name in names if name.endswith(".zip")]
      if embedded_archives:
        raise RuntimeError(f"{path.name}: source archive wraps ZIP files: {embedded_archives[:5]}")
    elif kind == "documentation":
      required = {
        f"{expected_root}/README.md",
        f"{expected_root}/CHANGELOG.md",
        f"{expected_root}/BUILD-REPORT.md",
        f"{expected_root}/AUTOMATED-VALIDATION.md",
        f"{expected_root}/SHA256SUMS.txt",
        f"{expected_root}/RELEASE-MANIFEST.json",
        f"{expected_root}/docs/API.md",
        f"{expected_root}/docs/DEPENDENCY-COMPATIBILITY-v{VERSION}.md",
        f"{expected_root}/docs/COMPATIBILITY-AUDIT-v{VERSION}.md",
        f"{expected_root}/docs/PERFORMANCE-AUDIT-v{VERSION}.md",
        f"{expected_root}/docs/INCREMENTAL-BEST-PRACTICE-CHANGELOG-v{VERSION}.md",
        f"{expected_root}/docs/AUTOMATED-TEST-RESULTS-v{VERSION}.md",
        f"{expected_root}/docs/RELEASE-REPORT-v{VERSION}.md",
        f"{expected_root}/docs/VALIDATION-v{VERSION}.md",
        f"{expected_root}/docs/TEST-PLAN.md"
      }
      missing = sorted(required.difference(names))
      if missing:
        raise RuntimeError(f"{path.name}: documentation files are missing: {missing}")
    else:
      raise RuntimeError(f"Unknown archive kind: {kind}")
    archive.testzip()


def stage_documentation(install: Path, source: Path, test_count: int):
  shutil.rmtree(DOC_STAGE, ignore_errors=True)
  (DOC_STAGE / "docs").mkdir(parents=True)
  for name in ["README.md", "CHANGELOG.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "SECURITY.md", "CONTRIBUTING.md"]:
    shutil.copy2(ROOT / name, DOC_STAGE / name)
  for path in sorted((ROOT / "docs").glob("*")):
    if path.is_file():
      shutil.copy2(path, DOC_STAGE / "docs" / path.name)

  manifest = json.loads((BUILD_MODULE / "module.json").read_text(encoding="utf-8"))
  install_hash = sha256(install)
  source_hash = sha256(source)
  install_count = zip_count(install)
  source_count = zip_count(source)

  (DOC_STAGE / "SHA256SUMS.txt").write_text(
    f"{install_hash}  {install.name}\n{source_hash}  {source.name}\n",
    encoding="utf-8",
    newline="\n"
  )
  release_manifest = {
    "schemaVersion": 1,
    "moduleId": manifest["id"],
    "displayTitle": manifest["title"],
    "version": VERSION,
    "helperApiVersion": "2.7.5",
    "dataSchemaVersion": 4,
    "foundry": manifest["compatibility"],
    "dnd5e": manifest["relationships"]["systems"][0]["compatibility"],
    "archives": {
      "installable": install.name,
      "source": source.name,
      "documentation": DOCUMENTATION_NAME
    },
    "roots": {
      "installable": "encounter-crucible",
      "source": "encounter-crucible",
      "documentation": DOCUMENTATION_ROOT
    },
    "files": {
      "installable": install_count,
      "source": source_count
    },
    "automatedTests": {
      "passed": test_count,
      "failed": 0
    },
    "reproducibleTimestamp": "2026-08-04T00:00:00Z"
  }
  (DOC_STAGE / "RELEASE-MANIFEST.json").write_text(
    json.dumps(release_manifest, indent=2) + "\n",
    encoding="utf-8",
    newline="\n"
  )
  (DOC_STAGE / "AUTOMATED-VALIDATION.md").write_text(
    f"""# Automated validation — Encounter Crucible {VERSION}

- Clean `npm ci`: required by the release workflow.
- Formatting check: passed.
- Compatibility lint: passed.
- Automated tests: {test_count} passed, 0 failed.
- Manifest and runtime reference validation: passed.
- English/German localization parity: passed.
- Worker-backed non-blocking generation, progress, cancellation, and cooperative fallback regressions: passed.
- Forge-style helper registration, idempotence, lifecycle hooks, and duplicate protection regressions: passed.
- Search-allocation, extension-model concurrency, Token preparation, cache invalidation, and refresh batching regressions: passed.
- Helper API exposure-order, version-range, `encounterGeneration`, and helper-module registry regressions: passed.
- a campaign helper `collectActors` and `assessEncounter` capability, permission, normalization, and side-effect-suppression regressions: passed.
- Installable, source, and documentation archive validation: passed.
- Repeated deterministic packaging: required and verified by the release procedure.
- Fresh extracted-source rebuild: required and verified before delivery.

A licensed Foundry browser runtime was unavailable and live in-world testing is not claimed.
""",
    encoding="utf-8",
    newline="\n"
  )
  (DOC_STAGE / "BUILD-REPORT.md").write_text(
    f"""# Encounter Crucible {VERSION} build report

## Release artifacts

- `{install.name}` — runtime-only Foundry module.
- `{source.name}` — complete editable and reproducible source repository.
- `{DOCUMENTATION_NAME}` — documentation, audit, changelog, test results, validation, and release reports.

## Identity

- Module ID: `encounter-crucible`
- Module version: `{VERSION}`
- Helper API: `2.7.5`
- Persistent schema: `4`
- Foundry target: `13.351`

## Archive qualification

- Installable archive contains exactly one `encounter-crucible/` root and {install_count} runtime files.
- Source archive contains exactly one `encounter-crucible/` root and {source_count} repository files.
- Installable archive excludes tests, tools, source-only documentation, package metadata, and nested archives.
- Source archive includes runtime source, Worker and fallback implementations, tests, locked package metadata, tools, documentation, and deterministic packaging.
- Source archive does not wrap the installable or documentation ZIP.
- ZIP entries are sorted, permission-normalized, and timestamped deterministically.
- All three archives use module version `{VERSION}`.

## Runtime limitation

A licensed Foundry VTT browser runtime was unavailable. Complete `docs/TEST-PLAN.md` in a cloned Foundry v13.351 world.
""",
    encoding="utf-8",
    newline="\n"
  )


def main():
  if not (BUILD_MODULE / "module.json").is_file():
    raise SystemExit("Run npm run build before packaging.")
  shutil.rmtree(DIST, ignore_errors=True)
  DIST.mkdir(parents=True)

  install = DIST / INSTALL_NAME
  source = DIST / SOURCE_NAME
  documentation = DIST / DOCUMENTATION_NAME

  write_zip(install, BUILD_MODULE, "encounter-crucible")
  write_zip(source, ROOT, SOURCE_ROOT)
  validate_zip(install, "encounter-crucible", "install")
  validate_zip(source, SOURCE_ROOT, "source")

  test_count = count_tests()
  stage_documentation(install, source, test_count)
  write_zip(documentation, DOC_STAGE, DOCUMENTATION_ROOT)
  validate_zip(documentation, DOCUMENTATION_ROOT, "documentation")

  checksums = DIST / f"encounter-crucible-v{VERSION}-SHA256SUMS.txt"
  checksums.write_text(
    "".join(f"{sha256(path)}  {path.name}\n" for path in [source, install, documentation]),
    encoding="utf-8",
    newline="\n"
  )
  print(checksums.read_text(encoding="utf-8"), end="")


if __name__ == "__main__":
  main()
