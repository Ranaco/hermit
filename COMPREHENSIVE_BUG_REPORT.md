# Comprehensive Bug and Issue Report
**Date:** April 27, 2026
**Scope:** All services and workspace packages

This report outlines all identified problems, bugs, and missing implementations across the project workspaces and applications, categorized by service/component.

---

## 1. Infrastructure & Workspace Packages

### Issue 1.1: Missing `bunchee` Build Dependency
- **Severity**: High
- **Affected Components**: `@hermit/error-handling`, `@hermit/logger`
- **Description**: The `build` script in these packages fails with `bunchee: command not found`.
- **Recommended Action**: Install `bunchee` as a development dependency in the affected packages or at the workspace root to ensure `turbo run build` completes successfully.

### Issue 1.2: Missing `jest` Test Dependency
- **Severity**: High
- **Affected Components**: `@hermit/logger`, `@hermit/ui`
- **Description**: The `test` script in these packages fails with `jest: command not found`.
- **Recommended Action**: Install `jest` as a development dependency in the affected packages or ensure it's globally available to the workspace during test runs.

---

## 2. API Service (`apps/api` / `@hermit/api`)

### Issue 2.1: Incompatible `ResourceType` Enum
- **Severity**: High
- **Affected Components**: `src/services/audit.service.ts`
- **Description**: TypeScript reports that the string `"GROUP"` is not assignable to type `ResourceType`. The `@prisma/client` does not currently include `"GROUP"` in its `ResourceType` enum.
- **Recommended Action**: Update the `schema.prisma` file to include `GROUP` in the `ResourceType` enum. Regenerate the Prisma client to resolve the type mismatch across the service.

### Issue 2.2: Invalid JWT Sign Callback Configuration
- **Severity**: High
- **Affected Components**: `src/utils/jwt.ts`
- **Description**: The `jwt.sign` function is throwing a `No overload matches this call` error because `expiresIn` is being incorrectly provided within the callback parameter rather than the `SignOptions` parameter.
- **Recommended Action**: Fix the `jwt.sign` function call by moving the `expiresIn` configuration to the options object (the 3rd argument) instead of the callback.

### Issue 2.3: Extraneous `permissions` Field in Vault Creation
- **Severity**: High
- **Affected Components**: `src/wrappers/onboarding.wrapper.ts`, `src/wrappers/organization.wrapper.ts`
- **Description**: Trying to specify `permissions` inside `VaultCreateInput` causes a TypeScript compilation error as it is an unknown property in the Prisma schema.
- **Recommended Action**: Remove the `permissions` property from the Vault create payload, or update the Prisma schema to allow creating permissions nested inside the `Vault` creation query.

### Issue 2.4: Unimplemented Bootstrapping Steps
- **Severity**: Medium
- **Affected Components**: `src/server.ts`
- **Description**: `TODO` comments indicate that database migrations and Vault key initialization steps have not been implemented.
- **Recommended Action**: Implement the runtime execution of pending database migrations and logic for bootstrapping Vault keys during application startup.

---

## 3. Web Service (`apps/web` / `@hermit/web`)

### Issue 3.1: Missing Types and Methods in `VaultService`
- **Severity**: High
- **Affected Components**: `src/hooks/use-vaults.ts`, `@/services/vault.service`
- **Description**: `use-vaults.ts` imports types (`GrantPermissionData`, `GrantTeamPermissionData`) and calls methods (`grantPermission`, `revokePermission`, `grantTeamPermission`, `revokeTeamPermission`) that do not exist or are not exported from `VaultService`.
- **Recommended Action**: Export the missing types and implement the corresponding missing permission management methods inside the frontend `VaultService` class.

### Issue 3.2: Next.js Prerendering Error (Missing Suspense Boundary)
- **Severity**: High
- **Affected Components**: `src/app/login` (Login Page)
- **Description**: During the Next.js static build process (`next build`), an error is thrown on the `/login` route: `useSearchParams() should be wrapped in a suspense boundary`. This causes the build to exit with code 1.
- **Recommended Action**: Wrap the component (or the specific hook usage) inside a React `<Suspense>` boundary in the `/login` page to comply with Next.js Client-Side Rendering bailout requirements.

---

## 4. Other Services (`apps/cli`, `apps/hcv_engine`, `apps/docs`, `apps/krakend`)

### Issue 4.1: General Status
- **Severity**: Low
- **Affected Components**: CLI, HCV Engine, Docs, API Gateway (Krakend)
- **Description**: No specific critical syntax, typechecking, or build failures were immediately identified during the workspace linting and typechecking sweeps.
- **Recommended Action**: Continue monitoring these services. Ensure that they are included in root-level CI steps for continuous validation.
