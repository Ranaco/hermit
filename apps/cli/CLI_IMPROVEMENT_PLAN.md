# Hermit CLI — Improvement Plan

## Phase 1: Foundations (High impact, low effort)

These changes are small but fix real friction points for scripting and piping — the #1 use case for a secrets CLI.

---

### 1.1 Raw stdout when piped (`secret get` / shorthand `get`)

**Problem:** `hermit get DB_URL` always renders a panel with borders, version info, timestamps. When piped (`DB_URL=$(hermit get DB_URL)`), the output is unusable.

**What to change:**

- In `secret get` (both `secretCommand` in `secret.ts` and the shorthand `get` in `index.ts`), detect when stdout is not a TTY _and_ output mode is `plain` (not `json`).
- In that case, print ONLY the raw secret value to stdout — no panel, no labels, no newlines.
- When `--json` is used, keep the current JSON behavior.
- When interactive (TTY), keep the current panel behavior.

**Files:**
- `commands/secret.ts` — `secret get` action handler (~line 244–332)
- `index.ts` — shorthand `get` action handler (~line 237–312)
- `lib/runtime.ts` — potentially add `isPlainMode()` helper

**Implementation sketch:**
```typescript
// At the end of the get handler, replace the panel rendering:
if (isJsonMode()) {
  // already handled by renderData above
} else if (!process.stdout.isTTY) {
  process.stdout.write(revealed.secret.value);
} else {
  ui.panel(revealed.secret.name, [ /* existing panel */ ]);
}
```

**Estimated effort:** ~30 min

---

### 1.2 Stdin support for `secret set`

**Problem:** Can't pipe a value into hermit: `cat cert.pem | hermit set TLS_CERT` doesn't work. Users must use `--file` or pass the value as an argument (which exposes it in shell history).

**What to change:**

- In `secret set` (both `secretCommand` and shorthand `set`), if no value argument and no `--file` flag, and stdin is not a TTY, read stdin to completion as the value.
- Follows the convention of `gh secret set`, `doppler secrets set`, `pbcopy`.

**Files:**
- `commands/secret.ts` — `secret set` action handler (~line 140–232)
- `index.ts` — shorthand `set` action handler (~line 319–430)

**Implementation sketch:**
```typescript
import { readFileSync } from "node:fs";

// After checking valueArg and opts.file, before prompting:
if (!value && !process.stdin.isTTY) {
  // Read all of stdin
  value = readFileSync("/dev/stdin", "utf-8").replace(/\n$/, "");
}
```

**Estimated effort:** ~20 min

---

### 1.3 Auto-default type to `MULTILINE` when `--file` is used

**Problem:** `hermit set TLS_CERT -f cert.pem` still prompts for value type interactively. If you're reading from a file, it should default to `MULTILINE` (or `STRING` if the file content is a single line).

**What to change:**

- In the `secret set` handler, if `opts.file` is provided and `opts.type` is not, auto-detect:
  - Single-line file → default to `STRING`
  - Multi-line file → default to `MULTILINE`
- Skip the type prompt entirely in this case.

**Files:**
- `commands/secret.ts` — `secret set` action handler
- `index.ts` — shorthand `set` (if it gets `--file` support, see Phase 2)

**Implementation sketch:**
```typescript
// After reading the file value, before the type prompt:
const valueType: ValueType =
  opts.type ||
  (opts.file
    ? (value!.includes("\n") ? "MULTILINE" : "STRING")
    : isNonInteractive()
      ? "STRING"
      : await promptSelect<ValueType>({ /* ... */ }));
```

**Estimated effort:** ~15 min

---

### 1.4 Add `-p` to `run` command

**Problem:** Every other command has `-p` as shorthand for `--path`, but `run` still requires `--path`.

**Files:**
- `commands/run.ts` — line ~296

**Change:**
```diff
- .option("--path <path>", "Group path like prod/api")
+ .option("-p, --path <path>", "Group path like prod/api")
```

**Estimated effort:** ~2 min

---

## Phase 2: Deduplicate shorthands (High impact, medium effort)

### 2.1 Extract shared command logic from `index.ts`

**Problem:** `index.ts` is ~530 lines, mostly duplicating logic from `commands/secret.ts` and `commands/group.ts`. The shorthand `set` even re-declares `resolveKeyId` as an inline function. Features added to `secret set` (like `-f, --file`, `-p`) don't exist in the shorthand `set`. Every change needs to be applied in two places.

**What to change:**

Create a shared module `lib/secret-handlers.ts` that exports the core logic as reusable functions. Both the subcommands and the shorthands call the same functions.

**Files to create:**
- `lib/secret-handlers.ts` — extracted logic

**Files to modify:**
- `commands/secret.ts` — delegate to shared handlers
- `index.ts` — delegate to shared handlers, shrink from ~530 to ~150 lines

**Shared functions to extract:**

```typescript
// lib/secret-handlers.ts

export interface ListSecretsParams {
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  search?: string;
}

export async function handleSecretList(params: ListSecretsParams): Promise<void>;

export interface SetSecretParams {
  name?: string;
  value?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  keyId?: string;
  type?: string;
  description?: string;
  password?: boolean;
  file?: string;
}

export async function handleSecretSet(params: SetSecretParams): Promise<void>;

export interface GetSecretParams {
  query?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  password?: string;
  vaultPassword?: string;
  copy?: boolean;
}

export async function handleSecretGet(params: GetSecretParams): Promise<void>;

export interface DeleteSecretParams {
  query?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  yes?: boolean;
}

export async function handleSecretDelete(params: DeleteSecretParams): Promise<void>;
```

Then the shorthand `get` in `index.ts` becomes:

```typescript
program
  .command("get <pathName>")
  .description("Reveal a secret value (alias: secret get)")
  .option("--vault <query>", "Vault name or id")
  .option("--password <password>", "Secret password")
  .option("--vault-password <password>", "Vault password")
  .option("-c, --copy", "Copy to clipboard")
  .action((pathName, opts) => runCommand(async () => {
    const { path, name } = parsePathArg(pathName);
    await handleSecretGet({ query: name, pathQuery: path, ...opts });
  }));
```

**Estimated effort:** ~2-3 hours

---

## Phase 3: New output modes (High impact, medium effort)

### 3.1 Add `-o, --output <format>` global flag

**Problem:** Only `--json` exists. No way to get raw values for piping, or control format per-command.

**What to change:**

Add a global `-o, --output <format>` option with values: `json`, `table`, `raw`, `plain`.

- `json` — structured JSON (same as current `--json`)
- `table` — tabular output for list commands (default for TTY)
- `raw` — raw value only, no decoration (for `secret get` piping)
- `plain` — current plain text mode (default for non-TTY)

Keep `--json` as sugar for `-o json`.

**Files:**
- `index.ts` — add global option, update `preAction` hook
- `lib/runtime.ts` — extend `OutputMode` type, add `isRawMode()` helper
- All command handlers — respect the new modes where relevant

**Implementation notes:**
- `raw` mode is mainly useful for `secret get` (print just the value) and `secret list` (print just names, one per line).
- `table` could be added later as a stretch goal; for now `raw` is the priority.
- Backward compat: `--json` keeps working as before.

**Estimated effort:** ~2 hours

---

### 3.2 Add `-q, --quiet` global flag

**Problem:** Success messages (`Secret "x" created`, `Logged in as...`) clutter script output.

**What to change:**

- Add `--quiet` / `-q` global option.
- In quiet mode, suppress all `ui.success()`, `ui.info()`, `ui.warn()` calls.
- Errors still print (via `ui.error()`).
- JSON mode still works (structured output is not "noise").

**Files:**
- `index.ts` — add global option
- `lib/runtime.ts` — add `quiet` to state, add `isQuiet()` helper
- `lib/ui.ts` — gate `success()`, `info()`, `warn()` on `!isQuiet()`

**Estimated effort:** ~1 hour

---

## Phase 4: Import / Export (High impact, medium effort)

### 4.1 `hermit secret export` / `hermit env`

**Problem:** No way to export secrets as `.env` files or shell export statements. `hermit run` injects into a child process but sometimes you just need the env file.

**New command:**

```
hermit env [options]
hermit secret export [options]
```

**Options:**
- `-p, --path <path>` — group path
- `--vault <query>` — vault
- `--format <fmt>` — `dotenv` (default), `shell`, `json`, `yaml`
- `--output <file>` — write to file instead of stdout
- `--password <password>` — secret-level password
- `--vault-password <password>` — vault password

**Usage examples:**
```bash
hermit env -p prod/api > .env
hermit env -p prod/api --format shell | source /dev/stdin
hermit secret export -p prod/api --format json > secrets.json
```

**Files to create:**
- `commands/export.ts` — new command

**Files to modify:**
- `index.ts` — register command + `env` shorthand

**Implementation notes:**
- Reuse `sdk.bulkRevealSecretsCli()` (same as `run` command)
- Reuse `buildInjectedEnvVars()` from `run.ts` (extract to shared module)
- Dotenv format: `KEY=value` with proper quoting for special chars
- Shell format: `export KEY="value"`
- JSON format: `{ "KEY": "value" }`

**Estimated effort:** ~3 hours

---

### 4.2 `hermit secret import`

**Problem:** No way to bulk-import secrets from a `.env` file or JSON. Onboarding requires setting secrets one at a time.

**New command:**

```
hermit secret import <file> [options]
```

**Options:**
- `-p, --path <path>` — target group path
- `--vault <query>` — vault
- `--format <fmt>` — `dotenv` (auto-detect), `json`
- `--type <type>` — default value type for all imported secrets
- `--overwrite` — update existing secrets (default: skip with warning)
- `--dry-run` — show what would be imported without making changes
- `-y, --yes` — skip confirmation

**Usage examples:**
```bash
hermit secret import .env -p prod/api
hermit secret import secrets.json --format json -p staging
cat .env | hermit secret import - -p dev  # stdin support
```

**Files to create:**
- `commands/import.ts` — new command

**Files to modify:**
- `index.ts` — register command

**Implementation notes:**
- Parse `.env` using the existing `parseMultilineSecret()` logic from `run.ts` (extract to shared util)
- JSON format: expects `{ "KEY": "value" }` flat object
- Show summary before importing (count, group target)
- Report results: created N, updated N, skipped N

**Estimated effort:** ~4 hours

---

## Phase 5: Developer experience (Nice-to-have)

### 5.1 `--verbose` / `-v` global flag

**Problem:** When API calls fail, users get a message like "Could not reach server" with no debugging info.

**What to change:**

- Add `-v, --verbose` global flag
- In verbose mode, log request method, URL, status code, timing to stderr
- Useful for debugging auth, network, and API issues

**Files:**
- `index.ts` — add global option
- `lib/runtime.ts` — add `verbose` to state
- `lib/api-client.ts` — log request/response details in verbose mode

**Estimated effort:** ~1.5 hours

---

### 5.2 Shell completion (`hermit completion`)

**Problem:** No tab completion. Users must memorize commands and options.

**New command:**

```
hermit completion [shell]
```

Outputs shell completion script for bash, zsh, or fish.

**Usage:**
```bash
# Bash
eval "$(hermit completion bash)"

# Zsh
hermit completion zsh > ~/.zfunc/_hermit

# Fish
hermit completion fish | source
```

**Implementation options:**
- Use `omelette` or `tabtab` npm packages
- Or generate static completion scripts from Commander's command tree
- Commander.js doesn't have built-in completion, but the command structure can be introspected

**Files to create:**
- `commands/completion.ts` — generate completion scripts

**Estimated effort:** ~4-5 hours

---

### 5.3 Better error messages with context

**Problem:** `resolveGroupByPath` errors are generic: "No secret group path matches X". Doesn't say which segment failed or what's available.

**What to change:**

Enhance `resolveGroupByPath` in `lib/context.ts` to:
- Track which segment failed
- List available children at the failure point
- Suggest closest match (fuzzy)

**Before:**
```
error: No secret group path matches "prod/api"
```

**After:**
```
error: Group path "prod/api" failed at segment "api"
  No child of "prod" named "api"
  Available: staging, production, shared
  Did you mean: production?
```

**Files:**
- `lib/context.ts` — enhance `resolveGroupByPath()`

**Estimated effort:** ~2 hours

---

### 5.4 `hermit secret rename` and `hermit secret move`

**Problem:** Can't rename a secret or move it between groups without delete + recreate, which loses version history.

**New commands:**

```bash
hermit secret rename <query> <newName>
hermit secret move <query> --path <targetGroup>
```

**Depends on:** API support for rename/move operations. If the API already supports `updateSecret` with name and `secretGroupId` changes, this is purely CLI work. If not, requires API changes first.

**Files:**
- `commands/secret.ts` — add `rename` and `move` subcommands
- `lib/sdk.ts` — may need new API methods

**Estimated effort:** ~2 hours (CLI only, assumes API supports it)

---

### 5.5 `hermit secret history`

**Problem:** Versions are tracked but there's no way to list them or retrieve old versions from the CLI.

**New command:**

```bash
hermit secret history <query>           # list versions
hermit secret get <query> --version 2   # get specific version
```

**Depends on:** API endpoint for listing secret versions. `revealSecret` already accepts `versionNumber`, so retrieving old versions may already work.

**Files:**
- `commands/secret.ts` — add `history` subcommand, add `--version` to `get`
- `lib/sdk.ts` — add `getSecretVersions()` if API supports it

**Estimated effort:** ~2-3 hours

---

## Execution Order

```
Phase 1 (Week 1) — Foundations
  1.4  Add -p to run                    [  2 min ]
  1.1  Raw stdout when piped            [ 30 min ]
  1.2  Stdin support for set            [ 20 min ]
  1.3  Auto-type for --file             [ 15 min ]

Phase 2 (Week 1-2) — Deduplicate
  2.1  Extract shared handlers          [ 2-3 hr ]

Phase 3 (Week 2) — Output modes
  3.2  --quiet flag                     [  1 hr  ]
  3.1  -o/--output format flag          [  2 hr  ]

Phase 4 (Week 2-3) — Import/Export
  4.1  secret export / env command      [  3 hr  ]
  4.2  secret import                    [  4 hr  ]

Phase 5 (Week 3+) — DX polish
  5.1  --verbose flag                   [ 1.5 hr ]
  5.3  Better error messages            [  2 hr  ]
  5.4  secret rename / move             [  2 hr  ]
  5.5  secret history                   [ 2-3 hr ]
  5.2  Shell completion                 [ 4-5 hr ]
```

**Total estimated effort: ~25-30 hours**
