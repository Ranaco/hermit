# @hermit-kms/cli

## 0.4.1

### Patch Changes

- ca7e4bc: Update for commands, shorthands and connection issues

## 0.4.0

### Minor Changes

- 6254a77: Update for string manipulation and secret handling.

## 0.3.7

### Patch Changes

- 092fd87: Fix `hermit run --secret` crashing when `valueType` is undefined in bulk reveal response. Also fall back to ID-prefix matching when no secret name matches exactly, so `--secret 5` finds a secret whose ID starts with `5`.

## 0.3.6

### Patch Changes

- 343314f: Fix `hermit run --secret` not injecting env-file content as individual variables when the secret's value type is not MULTILINE. Any secret whose value contains newlines is now parsed as key=value pairs. Also adds partial ID prefix matching for `--secret` lookups: `--secret 449` matches the first secret whose ID starts with `449`.

## 0.3.5

### Patch Changes

- d912a77: Fix `hermit run` consuming the first command word as an inject path when explicit flags (--group, --path, etc.) are already set. `hermit run --group "team" npm run dev` now correctly runs `npm run dev` instead of `run dev`.

## 0.3.4

### Patch Changes

- a5cb2ec: Add top-level shorthand commands: `hermit ls [path]`, `hermit get <path/name>`, `hermit set <path/name> [value]`, `hermit rm <path/name>`, `hermit tree [path]`, `hermit login`, `hermit logout`. Positional path argument for `hermit run` (`hermit run prod/api -- npm run dev`).

## 0.3.3

### Patch Changes

- 729d230: Fix Windows ENOENT when spawning .cmd wrappers (npm, npx) in hermit run; default server URL changed to https://hermit.ranax.co/api/v1

## 0.3.1

### Patch Changes

- a1beb75: Add prepublishOnly script to ensure dist is built before publishing to npm
- c04272f: Expand MULTILINE secrets as dotenv key-value pairs during `run` injection. Each `KEY=VALUE` line in a multiline secret is injected as a separate environment variable, with support for quoted values and comment lines. Non-dotenv multiline secrets (e.g. certificates) fall back to single-variable injection.

## 0.3.0

### Minor Changes

- 69f8b55: Update for server base url

### Patch Changes

- 83fb7e4: fix: support HERMIT_SERVER_URL env var and show actionable error on connection failure

## 0.2.6

### Patch Changes

- Fix binary builds: remove @yao-pkg/pkg nested into-stream (ESM v9) so it falls back to the root CJS v6 install.

## 0.2.5

### Patch Changes

- Fix binary builds: use local ./node_modules/.bin/pkg instead of npx pkg (npx resolves the abandoned vercel/pkg from the registry). Add --no-bytecode --public flags for ESM dependency compatibility.

## 0.2.4

### Patch Changes

- Fix binary CI: pin into-stream to CJS-compatible v6 as a workflow step to work around @yao-pkg/pkg ESM dependency issue.

## 0.2.3

### Patch Changes

- Fix CI: use ubuntu-latest for all binary builds (pkg cross-compiles for all platforms; macos-13 runner deprecated).

## 0.2.2

### Patch Changes

- Fix binary builds: move into-stream CJS override to root package.json so it applies during CI installs.

## 0.2.1

### Patch Changes

- Fix standalone binary builds: resolve import.meta.url shim for CJS bundle and correct pkg output naming.

## 0.2.0

### Minor Changes

- Initial public release of Hermit KMS CLI (`hermit`). Manage secrets, vaults, keys, orgs, and teams from your terminal.
