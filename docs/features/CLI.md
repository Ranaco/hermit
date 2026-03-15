# Hermit CLI Documentation

> **Version**: `0.1.0`
> **Package**: `@hermit/cli`
> **Binary**: `hermit`
> **Runtime**: Node.js 18+
> **Last Updated**: `2026-03-08`

Hermit CLI is a terminal-native secret management tool for the Hermit KMS platform. It provides authentication, organization and vault context management, vault, key, secret, team, and organization management, and environment injection for development and CI workflows.

## Command Surface

### Global flags

```bash
hermit --json
hermit --non-interactive
hermit --no-color
```

### `auth`

```bash
hermit auth login
hermit auth logout
hermit auth status
hermit auth mfa setup
hermit auth mfa enable
hermit auth mfa disable
```

Compatibility alias:

```bash
hermit auth setup-mfa
```

### `org`

```bash
hermit org list
hermit org create --name "Acme"
hermit org select acme
hermit org current
```

### `team`

```bash
hermit team list
hermit team create --name platform
hermit team members platform
hermit team add-member platform --user <userId>
```

### `vault`

```bash
hermit vault list
hermit vault create --name production --password
hermit vault select prod
hermit vault get
hermit vault delete prod --yes
```

### `key`

```bash
hermit key list
hermit key create --name app-key --type STRING
hermit key get <id>
hermit key rotate <id>
hermit key delete <id> --yes
```

### `group`

Hermit supports both legacy `group` terminology and path-first hierarchy UX.

```bash
hermit group list
hermit group create --name api
hermit group create --path prod --name api
hermit group tree
hermit group update api --name backend
hermit group delete backend --yes
```

### `secret`

```bash
hermit secret list
hermit secret list --path prod/api
hermit secret set DATABASE_URL postgres://...
hermit secret get DATABASE_URL --copy
hermit secret get DATABASE_URL --password <secret-password>
hermit secret get DATABASE_URL --vault-password <vault-password>
hermit secret delete DATABASE_URL --yes
```

Key behavior:

- `secret set` auto-creates `default-key` if no key exists in the vault
- `--group` and `--path` both resolve secret hierarchy
- password-protected reveal retries now distinguish secret-level and vault-level password challenges

### `run`

```bash
hermit run -- npm run dev
hermit run --vault production -- npm start
hermit run --org acme --vault production --path prod/api -- docker compose up
hermit run --env development -- npm run dev
hermit run --env production --vault-password <vault-password> -- node server.js
```

Behavior:

- uses bulk secret reveal where possible
- injects secrets into the executed child process environment
- never writes injected secrets to project config files
- fails fast when org or vault context is ambiguous
- skips protected secrets that cannot be revealed in non-interactive mode

### `config`

```bash
hermit config init
hermit config show
hermit config set-server https://example.com/api/v1
```

### `whoami`

```bash
hermit whoami
```

Shows current user, active org, active vault, server, and MFA status.

## `.hermit.yml`

Supported filenames:

- `.hermit.yml`
- `.hermit.yaml`

Example:

```yaml
version: 1
server: https://example.com/api/v1

environments:
  development:
    organization: acme
    vault: my-project
    path: dev/api
    secrets:
      - DATABASE_URL
      - REDIS_URL
    map:
      DATABASE_URL: APP_DATABASE_URL

  production:
    organization: acme
    vault: my-project
    group: prod-config
```

Rules:

- `vault` is required
- `organization` is optional but recommended for deterministic multi-org usage
- `group` and `path` are mutually exclusive
- top-level `server` overrides the stored server for commands that load `.hermit.yml`
- CLI flag precedence is: explicit flags > env block > active stored context

## Context Resolution

- If exactly one organization is available, the CLI can adopt it automatically.
- If multiple organizations are available and none is selected, the CLI stops and requires `hermit org select <org>` or an explicit `--org`.
- If exactly one vault exists in the resolved organization, the CLI can adopt it automatically.
- If multiple vaults exist, the CLI stops and requires `hermit vault select <vault>` or an explicit `--vault`.

## Output Modes

### Interactive mode

- Hermit-styled cards and boxes
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

- access and refresh tokens are stored via `conf`
- access token refresh uses the current API refresh route
- injected secrets are passed through the child-process environment only for command execution
- destructive actions require confirmation in interactive mode and `--yes` in non-interactive mode

## Notes

- The CLI aligns with the current Hermit API and active schema naming, including `teams` and secret-group hierarchy.
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
hermit --help
```

### Package install

```bash
npm install -g @hermit/cli
hermit --help
```

## CI/CD guidance

Recommended flags for automation:

```bash
hermit --non-interactive --json auth status
hermit --non-interactive run --env production --vault-password "$HERMIT_VAULT_PASSWORD" -- node server.js
```

Expected CI behavior:

- no prompts
- no animation
- deterministic non-zero exits on missing context or required confirmations
- destructive actions require `--yes`
- protected secrets skipped during `run` remain reported in the command result
