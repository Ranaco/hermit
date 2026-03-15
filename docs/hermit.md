# Hermit

Hermit is a multi-tenant key management and secret operations platform built around HashiCorp Vault Transit, a PostgreSQL-backed metadata layer, and a modern web dashboard plus CLI.

This document is the high-level reference for the repository as it exists today. It explains the system model, major applications, security boundaries, and local development workflow without replacing the deeper feature-specific docs under [`docs/`](/home/astar/Code/web/hermit/docs).

## What Hermit Does

Hermit is designed to help teams manage:

- Organizations and memberships
- Vaults scoped under organizations
- Keys scoped under vaults
- Secrets and secret versions protected by vault and secret passwords
- Dynamic IAM policies and custom roles
- One-time secret sharing
- Terminal-native workflows through the Hermit CLI

At a high level, the hierarchy is:

```text
Organization
  -> Vault
    -> Key
    -> Secret
      -> SecretVersion
```

## Core Architecture

Hermit uses a monorepo with Turborepo workspaces.

### Applications

- `apps/api`: Express 4.x REST API, validation, auth, IAM enforcement, audit flow, and Vault integration
- `apps/web`: Next.js App Router dashboard for org, vault, key, secret, IAM, invite, and share workflows
- `apps/cli`: Node.js CLI for terminal-first secret operations and environment injection
- `apps/hcv_engine`: local HashiCorp Vault bootstrap and runtime helpers
- `apps/krakend`: API gateway configuration

### Shared Packages

- `packages/prisma`: Prisma schema, migrations, and generated runtime
- `packages/vault-client`: Vault client abstraction
- `packages/error-handling`: shared error classes and handling utilities
- `packages/logger`: shared logging primitives
- `packages/ui`: shared UI package
- `packages/config-eslint`: shared ESLint configuration
- `packages/config-typescript`: shared TypeScript configuration
- `packages/jest-presets`: shared test presets

## System Model

### Multi-tenant hierarchy

Hermit is organization-first. Every protected resource belongs to an organization, directly or indirectly.

- A user can belong to multiple organizations
- An organization owns many vaults
- A vault owns many keys and secrets
- A secret stores its encrypted material in version rows

This hierarchy matters across both API design and policy evaluation. Creation flows in the web app should not assume a single active parent context when the UI can instead offer a parent selector.

### Encryption model

Hermit does not persist plaintext secret material in the database.

- Secret and key operations go through the encryption service and wrapper layer
- HashiCorp Vault Transit performs encryption and decryption
- Prisma models store encrypted payloads, metadata, and relationships
- Secret versions carry encrypted values and encryption context

### Identity and access model

Hermit uses a dynamic IAM policy engine instead of fixed RBAC alone.

- Resources are addressed by URNs such as `urn:hermit:org:{orgId}:vault:{vaultId}:secret:{secretId}`
- Requests are checked through `requirePolicy(action, getResourceUrn)`
- Policies can be inherited from direct custom-role assignment and team-role assignment
- Explicit `DENY` overrides `ALLOW`
- Organization `OWNER` bypasses policy evaluation

This means the authorization layer is runtime-evaluated and resource-specific rather than based only on coarse static roles.

## Secret Protection Model

Hermit supports a three-tier protection model for secrets:

1. Authentication only
2. Vault-level password
3. Secret-level password

The API signals password challenges during reveal flows, and the web app is expected to surface those challenges inline rather than treating them as generic failures.

Important implementation details:

- Passwords are stored as hashes, not plaintext
- Password validation happens before decryption is attempted
- Frontend forms already enforce the expected minimum password length
- Secret reveal flows should preserve the distinction between `vault` and `secret` password requirements

## Request Lifecycle

The backend follows a layered pattern:

```text
Route -> Middleware -> Controller -> Service/Wrapper -> Prisma/Vault
```

### Validation

- Zod schemas define request shapes
- Validation middleware should forward Zod failures with `next(new ValidationError(...))`
- Validation errors should not be thrown synchronously in ways that can break Express 4.x async behavior

### Authorization

- Authentication establishes the caller
- Policy middleware resolves the resource URN
- Controllers should assume authorization already happened unless explicitly designed otherwise

### Persistence and crypto

- Database writes go through Prisma
- Secret and key crypto flows must not bypass the encryption service and wrappers
- Vault Transit remains the source of truth for encryption and decryption operations

## Main Product Surfaces

### Web dashboard

The web application under `apps/web` is the main operator UI.

Key workflows include:

- authentication and invite acceptance
- onboarding and organization creation
- organization switching
- vault creation with parent organization selection
- key creation with parent vault selection
- secret creation, versioning, reveal, and password challenge handling
- IAM policy and custom role management
- one-time share creation and public consumption

The app uses React Query heavily for data fetching and mutation orchestration.

### CLI

The CLI under `apps/cli` exposes Hermit from the terminal.

Primary capabilities include:

- auth and MFA flows
- organization, team, vault, key, and secret commands
- path and group-aware secret lookup
- `hermit run -- ...` environment injection for child processes
- non-interactive and JSON-friendly execution modes

The CLI is intended for developer workflow and automation use cases without writing secrets to disk.

### One-time secret sharing

Hermit supports externally shareable one-time links:

- payloads are encrypted at rest
- shares can expire
- shares can require a passphrase
- successful consumption destroys future access

## Repository Layout

```text
hermit/
├── apps/
│   ├── api/
│   ├── cli/
│   ├── hcv_engine/
│   ├── krakend/
│   └── web/
├── docs/
├── packages/
│   ├── config-eslint/
│   ├── config-typescript/
│   ├── error-handling/
│   ├── jest-presets/
│   ├── logger/
│   ├── prisma/
│   ├── ui/
│   └── vault-client/
├── AGENTS.md
├── package.json
└── turbo.json
```

## Local Development

### Requirements

- Node.js 18+
- npm 9+ or a compatible workspace-aware package manager
- Docker for local PostgreSQL and HashiCorp Vault

### Root scripts

From the repository root:

```bash
npm install
npm run build
npm run dev
npm run lint
npm run test
npm run check-types
```

### API setup

Use [`apps/api/.env.example`](/home/astar/Code/web/hermit/apps/api/.env.example) as the template for local API configuration.

Key defaults in the repository:

- API port: `5001`
- API prefix: `/api/v1`
- Vault transit mount: `transit`

### Web setup

The web app expects a public API base URL. In local development that is typically:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

### Typical startup flow

1. Start PostgreSQL
2. Start HashiCorp Vault
3. Enable or configure the required Vault engines and roles
4. Install workspace dependencies
5. Run Prisma generation and migrations
6. Start the API
7. Start the web app or CLI as needed

## Engineering Constraints

When working in Hermit, preserve these project-level rules:

- Keep TypeScript strict and avoid `any`
- Do not bypass encryption services for secrets or keys
- Preserve explicit parent selection for vault and key creation flows
- Keep IAM checks resource-specific and URN-driven
- Pass validation failures downstream through Express middleware
- Treat org `OWNER` as the policy-engine bypass role

## Related Documents

- [`README.md`](/home/astar/Code/web/hermit/README.md)
- [`AGENTS.md`](/home/astar/Code/web/hermit/AGENTS.md)
- [`docs/quickstart.md`](/home/astar/Code/web/hermit/docs/quickstart.md)
- [`docs/features/iam-policy-engine.md`](/home/astar/Code/web/hermit/docs/features/iam-policy-engine.md)
- [`docs/features/organization_system.md`](/home/astar/Code/web/hermit/docs/features/organization_system.md)
- [`docs/features/one-time-secret-sharing.md`](/home/astar/Code/web/hermit/docs/features/one-time-secret-sharing.md)
- [`docs/features/CLI.md`](/home/astar/Code/web/hermit/docs/features/CLI.md)

## Current Status

This document reflects the repository state on March 6, 2026. If core flows, app boundaries, or security rules change, this file should be updated alongside the implementation.
