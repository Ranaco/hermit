# Hermes CLI Documentation

> **Version**: `0.1.0`
> **Package**: `@hermes/cli`
> **Binary**: `hermes`
> **Runtime**: Node.js 18+
> **Last Updated**: `2026-03-06`

Hermes CLI is a terminal-native secret management tool for the Hermes KMS platform. It provides secure authentication, vault, key, secret, team, and organization management, plus zero-leak environment injection for development and CI/CD workflows.

## Command Surface

### Global flags

```bash
hermes --json
hermes --non-interactive
hermes --no-color
```

### `auth`

```bash
hermes auth login
hermes auth logout
hermes auth status
hermes auth mfa setup
hermes auth mfa enable
hermes auth mfa disable
```

Compatibility alias:

```bash
hermes auth setup-mfa
```

### `org`

```bash
hermes org list
hermes org create --name "Acme"
hermes org select acme
hermes org current
```

### `team`

```bash
hermes team list
hermes team create --name platform
hermes team members platform
hermes team add-member platform --user <userId>
```

### `vault`

```bash
hermes vault list
hermes vault create --name production --password
hermes vault select prod
hermes vault get
hermes vault delete prod --yes
```

### `key`

```bash
hermes key list
hermes key create --name app-key --type STRING
hermes key get <id>
hermes key rotate <id>
hermes key delete <id> --yes
```

### `group`

Hermes supports both legacy `group` terminology and path-first hierarchy UX.

```bash
hermes group list
hermes group create --name api
hermes group create --path prod --name api
hermes group tree
hermes group update api --name backend
hermes group delete backend --yes
```

### `secret`

```bash
hermes secret list
hermes secret list --path prod/api
hermes secret set DATABASE_URL postgres://...
hermes secret get DATABASE_URL --copy
hermes secret delete DATABASE_URL --yes
```

Key behavior:

- `secret set` auto-creates `default-key` if no key exists in the vault
- `--group` and `--path` both resolve secret hierarchy
- password-protected reveal retries by prompting for the secret password

### `run`

```bash
hermes run -- npm run dev
hermes run --vault production -- npm start
hermes run --path prod/api -- docker compose up
hermes run --env development -- npm run dev
```

Behavior:

- uses bulk secret reveal where possible
- injects secrets only into the child process environment
- never writes secrets to disk
- skips protected secrets that cannot be non-interactively revealed

### `config`

```bash
hermes config init
hermes config show
hermes config set-server https://example.com/api/v1
```

### `whoami`

```bash
hermes whoami
```

Shows current user, active org, active vault, server, and MFA status.

## `.hermes.yml`

Supported filenames:

- `.hermes.yml`
- `.hermes.yaml`

Example:

```yaml
version: 1
server: https://example.com/api/v1

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

Rules:

- `vault` is required
- `group` and `path` are mutually exclusive
- CLI flag precedence is: explicit flags > env block > active stored context

## Output Modes

### Interactive mode

- Hermes-styled cards and boxes
- animated status lines
- prompts for selection and confirmation

### Plain mode

- auto-selected when not running in a TTY
- no animation
- no interactive prompts unless stdin is explicitly interactive

### JSON mode

- enabled with `--json`
- emits machine-readable output
- suppresses decorative terminal UI

## Security Model

- access and refresh tokens stored via `conf`
- access token refresh uses the current API refresh route
- injected secrets are passed only through child-process environment variables
- injected secrets are removed from the parent process after child exit
- destructive actions require confirmation in interactive mode and `--yes` in non-interactive mode

## Notes

- The CLI aligns with the current Hermes API and active schema naming, including `teams` and secret-group hierarchy.
- Full IAM authoring is intentionally not exposed yet; the CLI focuses on the core developer and operations workflow first.

## Installation and release usage

### Monorepo

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

### Package install

```bash
npm install -g @hermes/cli
hermes --help
```

## CI/CD guidance

Recommended flags for automation:

```bash
hermes --non-interactive --json auth status
hermes --non-interactive run --env production -- node server.js
```

Expected CI behavior:

- no prompts
- no animation
- deterministic non-zero exits on missing context or required confirmations
- destructive actions require `--yes`
- protected secrets skipped during `run` remain reported in the command result
