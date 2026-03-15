# Hermit CLI

Hermit CLI is the terminal-native interface for Hermit KMS. It covers authentication, explicit organization and vault context, team administration, key lifecycle operations, secret hierarchy management, and environment injection for local development and CI workflows.

## Requirements

- Node.js 18+
- A reachable Hermit API base URL, typically `http://localhost:5001/api/v1` in local development

## Install

### Monorepo usage

```bash
npm install
npm run -w apps/cli build
node apps/cli/dist/index.js --help
```

### Local linking

```bash
cd apps/cli
npm link
hermit --help
```

### Package installation

```bash
npm install -g @hermit/cli
hermit --help
```

## First-time setup

Set the API server:

```bash
hermit config set-server http://localhost:5001/api/v1
```

Authenticate and choose context:

```bash
hermit auth login
hermit org select <org>
hermit vault select <vault>
```

If your account can access multiple organizations or vaults, the CLI now requires an explicit selection instead of silently picking the first match.

## Core command families

```bash
hermit auth login
hermit org list
hermit team list
hermit vault list
hermit key list
hermit group tree
hermit secret list
hermit run -- npm run dev
hermit whoami
```

## Output modes

- Interactive TTY mode uses Hermit-styled status output, cards, and boxes.
- `--json` emits machine-readable output for automation.
- `--non-interactive` disables prompts and requires explicit flags for destructive flows.
- `--no-color` disables ANSI colors for plain logs and CI output.

## Secret hierarchy

Hermit supports both `group` terminology and path-first UX:

```bash
hermit group create --name prod
hermit group create --path prod --name api
hermit secret list --path prod/api
hermit run --inject prod/api -- npm run dev
hermit run --inject prod/api/DATABASE_URL -- node server.js
```

## Project config

Use `hermit config init` to generate `.hermit.yml`.

Example:

```yaml
version: 1
server: http://localhost:5001/api/v1

environments:
  development:
    organization: acme
    vault: my-project
    path: dev/api
    recursive: true
    secrets:
      - DATABASE_URL
      - REDIS_URL
    map:
      DATABASE_URL: APP_DATABASE_URL

  production:
    organization: acme
    vault: my-project
    group: prod-config
    recursive: true
```

Resolution precedence:

1. CLI flags
2. `.hermit.yml` environment block
3. active stored CLI context

Notes:

- Top-level `server` is applied when commands load `.hermit.yml`.
- `organization` lets `hermit run --env <name>` resolve the target vault deterministically.
- `group` and `path` are mutually exclusive.
- folder targets are recursive by default.
- mapped environment names must be unique or the run fails with a collision error.

## Protected secret access

Protected reveal flows support both layers of the current backend model:

```bash
hermit secret get DATABASE_URL --password <secret-password>
hermit secret get DATABASE_URL --vault-password <vault-password>
hermit run --env production --vault-password <vault-password> -- node server.js
hermit run --inject prod/api --vault-password <vault-password> -- node server.js
```

If a password is omitted in interactive mode, the CLI prompts for the required secret or vault password and retries with the correct field.

## CI usage

Use JSON and non-interactive mode together:

```bash
hermit --non-interactive --json auth status
hermit --non-interactive run --env production -- node server.js
```

Behavior in CI:

- no prompts
- no animated output
- destructive commands require `--yes`
- missing org or vault context fails fast instead of auto-selecting
- protected secrets are skipped during injected runs unless the workflow provides the required password flags
