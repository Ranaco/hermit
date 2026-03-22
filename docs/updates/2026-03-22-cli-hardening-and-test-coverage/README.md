# Hermit CLI Hardening, Resolver Cleanup, and Test Coverage - 2026-03-22

This update consolidates the recent CLI improvement work into a single pass focused on correctness, scripting UX, Windows reliability, local credential hardening, and real command-level regression coverage.

## Versions / scope

This document covers the unreleased CLI work currently staged in `apps/cli`.

Core areas included:

- shorthand command deduplication and handler reuse
- raw/plain output improvements for scripting
- stdin/file-driven secret input and import/export flows
- Windows-safe process spawning for `hermit run`
- shared cached resource resolution for groups and secrets
- per-user local encryption key migration for CLI credentials
- command-level integration tests using a fake Hermit API

---

## Foundations and scripting UX

The CLI now behaves correctly in shell pipelines and non-interactive workflows.

### Included

- `hermit get` now writes the raw secret value to stdout when used in non-TTY plain mode
- added explicit output control with `-o, --output <json|table|plain|raw>`
- added global `-q, --quiet`
- `hermit set` now supports stdin input when no value or file is provided
- `--file` input now auto-defaults to `STRING` vs `MULTILINE`
- `hermit run` now accepts `-p` as shorthand for `--path`

### Main code areas

- `apps/cli/src/lib/runtime.ts`
- `apps/cli/src/lib/ui.ts`
- `apps/cli/src/lib/secret-handlers.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/commands/run.ts`

---

## Command deduplication

Top-level shorthand commands were moved onto shared handler paths so behavior no longer drifts from the primary subcommands.

### Included

- `hermit login` / `hermit logout` now use the same device-aware auth flow as `hermit auth login` / `hermit auth logout`
- `hermit tree` and `hermit group tree` now share the same group-tree handler
- `secret` shorthands and nested commands now share the same secret handlers

### New shared modules

- `apps/cli/src/lib/auth-handlers.ts`
- `apps/cli/src/lib/group-handlers.ts`
- `apps/cli/src/lib/secret-handlers.ts`

This removes the earlier shorthand drift where top-level login skipped CLI device registration metadata.

---

## Import / export and environment workflows

The CLI now supports bulk environment export and secret import flows instead of only point operations.

### Included

- added `hermit env`
- added `hermit secret export`
- added `hermit secret import`
- extracted env parsing/serialization helpers into a shared module
- added dotenv, shell, json, and yaml export support
- added dotenv and json import support, including `-` stdin import
- fixed `secret import --json` so it emits a single valid JSON payload

### Main code areas

- `apps/cli/src/commands/export.ts`
- `apps/cli/src/commands/import.ts`
- `apps/cli/src/lib/env-utils.ts`

---

## Windows process-runner hardening

`hermit run` previously built a joined shell string on Windows, which could mis-handle spaces, quotes, and shell metacharacters.

### Included

- preserve the original argument array when spawning child processes
- only enable `shell: true` for Windows `.cmd` / `.bat` targets that actually require it
- added regression coverage for:
  - arguments containing `&`
  - arguments containing spaces and quotes
  - `cmd /c` shell command execution

### Main code areas

- `apps/cli/src/lib/process-runner.ts`
- `apps/cli/test/process-runner.test.mjs`

---

## Shared resolver and lookup cleanup

Group and secret selection previously used repeated recursive fetches and duplicate matching logic across `context`, `run`, and `secret` flows.

### Included

- added a shared cached resolver for:
  - group children
  - full accessible group trees
  - paged secret inventories per group
  - exact-name / exact-id / id-prefix secret matching
- rewired `context`, `run`, and `secret-handlers` to use the shared resolver
- improved path errors to report the failing segment and available children

### Main code areas

- `apps/cli/src/lib/resource-resolver.ts`
- `apps/cli/src/lib/context.ts`
- `apps/cli/src/commands/run.ts`
- `apps/cli/src/lib/secret-handlers.ts`

---

## Local credential storage hardening

The CLI previously used a fixed embedded encryption key for the `conf` store, which provided only shared obfuscation.

### Included

- replaced the fixed key with a generated per-user local key file
- migrated existing legacy stores to the new per-user key automatically
- bumped the store schema version
- retained compatibility for existing saved sessions and CLI device metadata

### Main code area

- `apps/cli/src/lib/auth-store.ts`

### Important note

This is a significant improvement over the previous baked-in key, but it is not the final security model.

**Follow-up still recommended:** move refresh tokens and device private key material to OS-native secret storage when the CLI is ready to take a platform-specific dependency or abstraction layer.

---

## Test coverage expansion

The CLI previously only had helper-level tests for UI rendering and process spawning.

### Included

Added a new integration suite that runs the built CLI against a local fake Hermit API and verifies:

- shorthand login uses the CLI device-aware flow
- authenticated status persists across independent CLI invocations
- non-TTY `hermit get` raw output works end to end
- `hermit env --format json` exports expanded env variables correctly
- `hermit secret import` creates secrets from dotenv input
- logout clears the persisted session

### Main test files

- `apps/cli/test/cli.integration.test.mjs`
- `apps/cli/test/process-runner.test.mjs`
- `apps/cli/test/ui.test.mjs`

---

## Internal decomposition

The most overloaded secret CLI module was split into smaller concerns.

### Included

- `secret-utils.ts` for scope, key, stdin/file, and lookup helpers
- `secret-output.ts` for list/reveal rendering
- `secret-handlers.ts` reduced to command orchestration

This keeps the current command surface unchanged while making future secret feature work easier to maintain.

---

## Current outcome

The current CLI worktree passes:

- `npm run -w apps/cli check-types`
- `npm run -w apps/cli lint`
- `npm run -w apps/cli test`

## Remaining follow-up

Not included in this update:

- OS-native secret storage backend
- `--verbose` request/response tracing in the API client
- shell completion
- broader `sdk.ts` / `ui.ts` domain splitting

The highest-priority future improvement remains moving stored refresh tokens and CLI device private keys into OS-native secret storage.
