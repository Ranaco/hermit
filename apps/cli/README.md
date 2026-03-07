# Hermes CLI

Hermes CLI is the terminal-native interface for Hermes KMS. It covers secure authentication, org and vault context management, team administration, key lifecycle operations, secret hierarchy management, and zero-leak environment injection for local development and CI/CD workflows.

## Requirements

- Node.js 18+
- A reachable Hermes API base URL, typically `http://localhost:3001/api/v1` in local development

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
hermes --help
```

### Package installation

```bash
npm install -g @hermes/cli
hermes --help
```

## First-time setup

Set the API server:

```bash
hermes config set-server http://localhost:3001/api/v1
```

Authenticate and choose context:

```bash
hermes auth login
hermes org select <org>
hermes vault select <vault>
```

## Core command families

```bash
hermes auth login
hermes org list
hermes team list
hermes vault list
hermes key list
hermes group tree
hermes secret list
hermes run -- npm run dev
hermes whoami
```

## Output modes

- Interactive TTY mode uses Hermes-styled status output, cards, and boxes.
- `--json` emits machine-readable output for automation.
- `--non-interactive` disables prompts and requires explicit flags for destructive flows.
- `--no-color` disables ANSI colors for plain logs and CI output.

## Secret hierarchy

Hermes supports both `group` terminology and path-first UX:

```bash
hermes group create --name prod
hermes group create --path prod --name api
hermes secret list --path prod/api
hermes run --path prod/api -- npm run dev
```

## Project config

Use `hermes config init` to generate `.hermes.yml`.

Example:

```yaml
version: 1
server: http://localhost:3001/api/v1

environments:
  development:
    vault: my-project
    path: dev/api
    secrets:
      - DATABASE_URL
      - REDIS_URL
    map:
      DATABASE_URL: APP_DATABASE_URL

  production:
    vault: my-project
    group: prod-config
```

Resolution precedence:

1. CLI flags
2. `.hermes.yml` environment block
3. active stored CLI context

## CI usage

Use JSON and non-interactive mode together:

```bash
hermes --non-interactive --json auth status
hermes --non-interactive run --env production -- node server.js
```

Behavior in CI:

- no prompts
- no animated output
- destructive commands require `--yes`
- password-protected secrets are skipped during injected runs unless the workflow explicitly reveals them
