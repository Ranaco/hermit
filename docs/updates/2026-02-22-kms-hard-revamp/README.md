# Hermes KMS Update - 2026-02-22

## Scope
This update is a full internal revamp (no backward-compatibility guarantees) of the Hermes KMS stack across:
- Prisma schema model layer
- API contracts and wrappers
- Web integration and dashboard UX
- Core domain terminology normalization (`group` -> `team`)

---

## 1) Schema-Level Hard Revamp (Prisma)

**Primary file:** `packages/prisma/schema.prisma`

### Model and enum updates
- Added `OnboardingState` enum:
  - `IN_PROGRESS`
  - `COMPLETED`
- `OrganizationMember.onboardingState` now uses enum and maps to existing DB column:
  - `@map("onboardingStatus")`
- Added `Organization.slug` (nullable unique)
- Standardized model naming at Prisma layer:
  - `Group` -> `Team` (`@@map("Group")`)
  - `GroupMember` -> `TeamMember` (`@@map("GroupMember")`)
  - `VaultPermission` -> `VaultBinding` (`@@map("VaultPermission")`)
  - `KeyPermission` -> `KeyBinding` (`@@map("KeyPermission")`)
- Remaining model-field naming debt removed:
  - `Organization.groups` -> `Organization.teams`
  - `User.groupMemberships` -> `User.teamMemberships`
- Resource type enum normalized:
  - `ResourceType.GROUP` -> `ResourceType.TEAM`

### Generator cleanup
- Prisma generator uses default `@prisma/client` output (custom output removed).

---

## 2) Database Migrations Added

### `packages/prisma/migrations/20260222120000_schema_hard_revamp/migration.sql`
- Creates onboarding enum as needed
- Adds/backfills `Organization.slug`
- Adds unique index for `Organization.slug`
- Converts onboarding text values to enum-backed values

### `packages/prisma/migrations/20260222124500_remove_group_legacy_naming/migration.sql`
- Renames enum value `GROUP` -> `TEAM` (safe guarded block)

---

## 3) API Layer Changes

### Organization + Team domain
**Files:**
- `apps/api/src/wrappers/organization.wrapper.ts`
- `apps/api/src/controllers/organization.controller.ts`
- `apps/api/src/routes/organization.routes.ts`
- `apps/api/src/validators/organization.validator.ts`

**Changes:**
- Team operations fully moved to `team` naming (`teamId` params)
- Organization creation now generates slug
- Onboarding writes use enum state (`onboardingState`)
- Removed legacy validator aliases for `group`

### Vault permissions domain
**Files:**
- `apps/api/src/wrappers/vault.wrapper.ts`
- `apps/api/src/controllers/vault.controller.ts`
- `apps/api/src/routes/vault.routes.ts`
- `apps/api/src/validators/vault.validator.ts`

**Changes:**
- Permissions model surface moved to `VaultBinding`
- Team relations used for scoped permissions
- Unique selectors changed to `teamId_vaultId`
- Routes standardized to:
  - `POST /api/v1/vaults/:id/permissions/teams`
  - `DELETE /api/v1/vaults/:id/permissions/teams/:teamId`
- Removed legacy group validator aliases

### Key permission validation naming cleanup
**File:** `apps/api/src/validators/key.validator.ts`
- `grantKeyGroupPermissionSchema` -> `grantKeyTeamPermissionSchema`
- `keyGroupIdParamSchema` -> `keyTeamIdParamSchema`
- Payload contract now expects `teamId`

### Prisma client import stabilization
**File:** `apps/api/src/services/prisma.service.ts`
- Uses `@prisma/client` import path (build-safe)

---

## 4) Web Integration Changes

### Service + hook alignment
**Files:**
- `apps/web/src/services/organization.service.ts`
- `apps/web/src/hooks/use-organizations.ts`
- `apps/web/src/services/vault.service.ts`
- `apps/web/src/hooks/use-vaults.ts`
- `apps/web/src/services/secret.service.ts`
- `apps/web/src/hooks/use-secrets.ts`
- `apps/web/src/store/organization.store.ts`

**Changes:**
- Team-first API payloads and route usage
- Removed legacy `group` aliases in vault hook/service layer
- Secret reveal flow improved for password-required responses
- Org/vault context behavior stabilized

---

## 5) UI/System Revamp

### Global design and shell
**Files:**
- `apps/web/src/app/globals.css`
- `apps/web/src/components/dashboard-layout.tsx`

**Changes:**
- New tokenized visual system (calmer palette, soft surfaces, refined spacing)
- Sidebar + topbar shell redesign
- Updated navigation:
  - Overview
  - Teams
  - Keys
  - Secrets
  - Vaults
  - Access Policies
  - Audit Logs
  - Settings

### New pages introduced
- `apps/web/src/app/dashboard/policies/page.tsx`
- `apps/web/src/app/dashboard/audit/page.tsx`

### Core pages redesigned
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/dashboard/organizations/page.tsx`
- `apps/web/src/app/dashboard/keys/page.tsx`
- `apps/web/src/app/dashboard/secrets/page.tsx`
- `apps/web/src/app/dashboard/vaults/page.tsx`
- `apps/web/src/app/dashboard/settings/page.tsx`
- `apps/web/src/app/dashboard/users/page.tsx`

### Selector components redesigned
- `apps/web/src/components/organization-selector.tsx`
- `apps/web/src/components/vault-selector.tsx`

---

## 6) API Surface (Current)

### Vault permissions
- `POST /api/v1/vaults/:id/permissions/users`
- `DELETE /api/v1/vaults/:id/permissions/users/:userId`
- `POST /api/v1/vaults/:id/permissions/teams`
- `DELETE /api/v1/vaults/:id/permissions/teams/:teamId`

### Organization teams
- `GET /api/v1/organizations/:id/teams`
- `POST /api/v1/organizations/:id/teams`
- `PATCH /api/v1/organizations/:id/teams/:teamId`
- `DELETE /api/v1/organizations/:id/teams/:teamId`
- `POST /api/v1/organizations/:id/teams/:teamId/members`
- `DELETE /api/v1/organizations/:id/teams/:teamId/members/:userId`

---

## 7) Current Project State

### Build health
- API build: pass (`npm run -w apps/api build`)
- Web lint: pass (`npm run -w apps/web lint`)
- Web production build: pass (`npm run -w apps/web build`)
- Prisma client generation: pass (`npm run -w packages/prisma migrate:generate`)

### Operational status
- Team-first domain model is now consistent across schema/API/UI
- Legacy `group` naming removed from active API and frontend contracts
- DB mapping (`@map`) retained only where needed to avoid destructive data rewrites
- Dashboard UX is fully modernized and integrated end-to-end

### Remaining non-blocking warnings
- `baseline-browser-mapping` data is stale
- Turbopack/Node warning: `--localstorage-file` path warning during build
- tsup warnings around bundled jest globals in test entry (does not fail build)

---

## 8) Notes
- This revamp intentionally prioritizes practical correctness and integration over backward compatibility.
- No test suite was added/executed beyond requested lint/build integration checks.
