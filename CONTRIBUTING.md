# Contributing to Hermit KMS

Thank you for your interest in contributing! This guide covers everything you need to get started.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Changeset Requirement](#changeset-requirement)

---

## Local Development Setup

See [docs/quickstart.md](./docs/quickstart.md) for the full guide. Quick summary:

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (for PostgreSQL and HashiCorp Vault)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Ranaco/hermit.git
cd hermit

# 2. Install all workspace dependencies
npm install

# 3. Start backing services
docker compose up -d

# 4. Copy env file and fill in values
cp apps/api/.env.example apps/api/.env

# 5. Run database migrations
npm run -w @hermit/prisma prisma:migrate

# 6. Build all packages
npm run build

# 7. Start the dev server
npm run dev
```

---

## Commit Convention

This project follows **Conventional Commits**. The changesets tooling and changelog generation depend on it.

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only changes |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, or dependency updates |
| `perf` | Performance improvements |

### Scopes (optional)

`api`, `cli`, `vault-client`, `prisma`, `web`, `docs`

### Examples

```
feat(cli): add `hermit secret copy` command
fix(api): correct 401 response on expired refresh token
docs: update quickstart guide for Docker Compose v2
chore(deps): bump commander to 13.2.0
```

---

## Pull Request Process

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** in focused, atomic commits using Conventional Commits.
3. **Add a changeset** (see below) if your change is user-facing.
4. **Open a PR** against `main`. Fill out the PR template completely.
5. **CI must pass** — lint, type-check, build, and tests are all required.
6. **One approving review** is required before merging.
7. PRs are merged via **squash merge** to keep the main branch history clean.

---

## Changeset Requirement

Every PR that makes a user-facing change (new feature, bug fix, breaking change) **must include a changeset file**. Changesets drive automated versioning and CHANGELOG generation.

### Adding a changeset

```bash
npx changeset add
```

Follow the interactive prompts:
1. Select the package(s) affected
2. Choose the bump type: `patch` (bug fix), `minor` (new feature), `major` (breaking change)
3. Write a one-line summary of the change (this goes in the CHANGELOG)

This creates a file in `.changeset/` — commit it alongside your code changes.

### What does NOT need a changeset

- Pure documentation changes
- Internal refactors with no API/behavior change
- CI/build/tooling changes
- Test-only changes

### Release flow

When changesets are present on `main`, the changesets bot automatically opens a **"Version Packages"** PR that:
- Bumps package versions
- Updates `CHANGELOG.md`

Merging that PR triggers the release workflow, which publishes to npm and creates a GitHub Release with standalone binaries.
