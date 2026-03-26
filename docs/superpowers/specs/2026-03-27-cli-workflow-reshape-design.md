# Hermit CLI: Workflow-First Reshape — Design Spec

**Date:** 2026-03-27
**Status:** Approved

## Core Ideology

One simple, universal system underneath, with opinionated, human-friendly workflows on top. The system is built on a single primitive — groups — because simplicity and consistency at the data layer matter for scalability and correctness. But users never have to think in those terms; they interact through familiar concepts like environments and commands like `run` that map directly to their daily workflow. The goal is not to expose power, but to make the most common thing — running an app with the right secrets — effortless and repeatable, while keeping deeper capabilities accessible but out of the way.

## Problem

Hermit CLI currently exposes its internal data model directly: org, vault, secretGroup, key, secret. This creates a mismatch between how the system works and how developers think. Developers think in environments (dev, staging, prod) and running apps — not encryption hierarchies.

The strongest feature is `hermit run`, but everything before it is setup cost. The CLI needs to center around: **context + environment + run**.

## Key Design Decisions

### 1. Groups as the Only Primitive

Groups (renamed from SecretGroup) are the universal organizing primitive. A group is a named container that holds secrets or other groups. There is no special "environment" data model.

### 2. Environments as a CLI Layer

`env` is a user-facing abstraction over groups — familiar language for developers. `env` commands map to group operations under the hood:

- `env list` → list root-level groups (or .hermit.yml environments)
- `env use dev` → set active group to `dev`
- `env pull dev` → output secrets as dotenv
- `env create dev` → create root-level group (root-level only)

### 3. Explicit Context Setting

`hermit use` requires explicit subcommands — no magic auto-resolution:
```
hermit use org <name>
hermit use vault <name>
hermit use env <name>
```

### 4. Config-First Resolution

When `.hermit.yml` exists, it is authoritative for environment definitions. Resolution order for `env use`:
1. `.hermit.yml` environment name → mapped group
2. Direct group name lookup in active vault
3. Fail clearly

### 5. Context Precedence (Locked)

1. CLI flags (`--org`, `--vault`, `--env`, `--group`)
2. Selected env (from `hermit env use`)
3. `.hermit.yml` (walk up directory tree)
4. Stored context (auth-store)
5. Interactive fallback

## CLI Command Surface

### Daily Layer
```
hermit login / logout
hermit init
hermit env list / show / use / create / pull / export / doctor
hermit use org|vault|env <name>
hermit current
hermit secret list / get / set / delete
hermit run [--env <name>] -- <cmd>
hermit exec (alias for run)
```

### Operator Layer (de-emphasized)
```
hermit org list / create / select / current
hermit vault list / create / select / get / delete
hermit group list / create / tree / update / delete / use
hermit key list / create / get / rotate / delete
hermit team list / create / members / add-member
hermit whoami
hermit config init / show / set-server
```

### Top-level Aliases
```
hermit ls [path]        → secret list
hermit get <path>       → secret get
hermit set <path> [val] → secret set
hermit rm <path>        → secret delete
hermit tree [path]      → group tree
```

## `hermit init` Flow

1. Check auth (prompt login if needed)
2. Detect/create org (skip if only one)
3. Detect/create vault (skip if only one)
4. Prompt: "Create environments?" (optional, free-form, suggest dev/staging/prod as example)
5. Create groups for each environment name
6. Prompt: "Import from .env?" → import into selected group
7. Write `.hermit.yml` (never silently overwrite — prompt or require `--force`)
8. Set active context
9. Print next-step suggestions

## `.hermit.yml` Format

```yaml
version: 1
org: my-org
vault: my-vault
default_env: dev

environments:
  dev:
    group: dev
    secrets:
      - DATABASE_URL
      - API_KEY
    map:
      DATABASE_URL: DB_URL
  staging:
    group: staging
  prod:
    group: prod
```

## `env` Command Details

| Command | Behavior |
|---|---|
| `env list` | Config environments if `.hermit.yml` present; else root-level groups |
| `env show <name>` | Definition + resolution info + secret count (not values) |
| `env use <name>` | Config-first resolution, then direct group lookup |
| `env create <name>` | Root-level only. Nested paths rejected → use `group create` |
| `env pull [name]` | Dev convenience: dotenv to stdout. Uses active env if omitted |
| `env export <name>` | Format-driven: `--format dotenv|json|yaml|shell`, `--output <file>` |
| `env doctor [name]` | Validates auth, vault, group, secrets, config |

## `current` Command

Shows both environment name and backing group when they differ:
```
Environment:  production
Group:        prod-config
```
When they match, single line: `Environment: dev`

## Output Standards

- `--json` — machine-readable JSON
- `--raw` — unformatted plain text
- `--quiet` — suppress informational output
- TTY: interactive (tables, colors, spinners). Non-TTY: plain.
- Exit codes: 0 success, 1 general error, 2 auth error, 3 config error, 126 child process error

## Data Model Changes

Rename `SecretGroup` → `Group` throughout:
- Prisma schema (model, relations, enums)
- API routes, controllers, wrappers, validators, services
- CLI SDK types, commands, handlers
- Frontend services, hooks, components

No new models. No new tables. Group hierarchy stays unchanged.

## Active Group Context

- Stored in auth-store: `{ id: string, name: string } | null`
- Validated lazily on use (not every CLI invocation)
- Auto-cleared with warning if stale/invalid
