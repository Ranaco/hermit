# Hermit CLI UX Improvements & Bug Fixes - 2026-03-17

## Versions shipped

- `@hermit-kms/cli@0.3.3` — Windows spawn fix
- `@hermit-kms/cli@0.3.4` — CLI UX shorthands + `hermit run` positional path
- `@hermit-kms/cli@0.3.5` — Secret injection fixes + partial ID lookup (pending release)

---

## Windows spawn fix (0.3.3)

`hermit run` previously threw `ENOENT` on Windows because the process runner tried to resolve the command to an absolute path. On Windows, `cmd.exe` handles PATH resolution when `shell: true` is set.

**Change:** `apps/cli/src/lib/process-runner.ts`
- Skip `resolveCommand` on Windows (`process.platform === "win32"`)
- Pass `shell: process.platform === "win32"` to `spawn`

---

## Top-level shorthand commands (0.3.4)

Added 7 top-level commands so common operations no longer require remembering full subcommand paths.

| Shorthand | Equivalent |
|---|---|
| `hermit ls [path]` | `hermit secret list` scoped to a group path |
| `hermit get <path/name>` | `hermit secret get` by name or path |
| `hermit set <path/name> [value]` | `hermit secret set` |
| `hermit rm <path/name>` | `hermit secret delete` |
| `hermit tree [path]` | `hermit group tree` |
| `hermit login` | `hermit auth login` |
| `hermit logout` | `hermit auth logout` |

**Change:** `apps/cli/src/index.ts`

---

## `hermit run` positional path shorthand (0.3.4)

`hermit run prod/api -- npm run dev` now works as a shorthand for `hermit run --inject prod/api -- npm run dev`.

The positional argument `[injectPath]` is only consumed as an inject path when no explicit injection flags (`--inject`, `--group`, `--path`, `--secret`, `--env`) are set. When flags are present, the positional is restored as the first command word.

**Bug fixed:** `hermit run --group "some team" npm run dev` was consuming `npm` as the inject path, running `run dev` instead of `npm run dev`.

**Change:** `apps/cli/src/commands/run.ts`

```typescript
if (injectPathArg) {
  if (!opts.inject && !opts.group && !opts.path && !opts.secret && !opts.env) {
    opts.inject = injectPathArg;
  } else {
    commandArgs = [injectPathArg, ...commandArgs];
  }
}
```

---

## Secret injection — env-file parsing (0.3.5)

Secrets whose value contains newlines are now parsed as `KEY=VALUE` pairs and injected as individual environment variables, regardless of the secret's `valueType` field. Previously only secrets explicitly typed `MULTILINE` were parsed this way.

**Use case:** a secret named `ENV` containing a full `.env` file now injects `NODE_ENV`, `DATABASE_URL`, etc. as individual vars rather than a single `ENV` variable holding the raw content.

**Change:** `apps/cli/src/commands/run.ts` — `buildInjectedEnvVars`

```typescript
// Before
if (secret.valueType === "MULTILINE") {

// After
if (secret.valueType.toUpperCase() === "MULTILINE" || secret.value.includes("\n")) {
```

---

## Partial ID lookup for `--secret` (0.3.5)

`--secret <query>` now falls back to ID prefix matching when no secret name matches exactly. Typing the first few characters of a secret's ID is enough to target it unambiguously.

- Exact name match → used immediately
- No name match → fetch all secrets in scope, return exact ID match first, then ID-prefix matches
- Multiple prefix matches → error with suggestions

**Change:** `apps/cli/src/commands/run.ts` — `findExactSecretsInGroup`

---

## Cross-platform test suite

Replaced the Unix-only `ls test/**/*.test.mjs | xargs` test script with an explicit file list compatible with Windows:

```json
"test": "npm run build && node --test --test-concurrency=1 test/ui.test.mjs test/process-runner.test.mjs"
```

Process-runner tests wrap all spawn subtests under a single parent with `{ concurrency: 1 }` to prevent concurrent exit-code interference within a single test file.
