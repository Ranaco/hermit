# API Production Hardening — Design Spec

**Date:** 2026-03-26
**Scope:** `apps/api/src`
**Goal:** Fix all security vulnerabilities, code quality problems, and inconsistencies to make the Hermit KMS API production-ready.

---

## Background

A full audit of the API surface identified 11 security issues and inconsistencies across middleware, utilities, wrappers, routes, and services. No architectural changes are required. All fixes are surgical and confined to the files where the issue originates.

---

## Issue Catalogue

### Security — Critical

#### S1 · CORS bypass on secret reveal route
- **File:** `src/routes/secret.routes.ts:171`
- **Issue:** A manual `router.options("/:id/reveal", ...)` handler sets `Access-Control-Allow-Origin` to `req.headers.origin || "*"` — any origin on the internet can read secret reveal responses, bypassing the configured CORS policy.
- **Fix:** Delete the manual OPTIONS handler entirely. The `cors()` middleware registered in `server.ts` already handles preflight correctly for all routes.

#### S2 · Trust proxy set to `true`
- **File:** `src/server.ts:52`
- **Issue:** `app.set("trust proxy", true)` trusts every proxy hop in the chain. Any client can spoof `X-Forwarded-For`, making rate-limiting and audit IP addresses meaningless.
- **Fix:** Change to `app.set("trust proxy", 1)` — trust exactly one proxy hop (nginx / Caddy / AWS ALB).

#### S3 · `Math.random()` in password generator
- **File:** `src/utils/password.ts:89`
- **Issue:** `generateRandomPassword` uses `Math.random()`, which is not cryptographically secure. Generated passwords are predictable.
- **Fix:** Replace with `crypto.randomBytes()` for character selection and a Fisher-Yates shuffle using `crypto.randomInt()`. Use rejection sampling to eliminate modulo bias.

#### S4 · `Math.random()` in MFA backup code generator
- **File:** `src/utils/mfa.ts:64`
- **Issue:** `generateBackupCodes` uses `Math.floor(Math.random() * 36)`. Backup codes are predictable.
- **Fix:** Replace with `crypto.randomInt(0, chars.length)` for each character.

#### S5 · MFA disable silently skips the MFA check
- **File:** `src/controllers/auth.controller.ts:133` and `src/validators/auth.validator.ts:88`
- **Issue:** The Zod schema (`disableMfaSchema`) validates the MFA token onto `req.body.token`, but the controller reads `req.body.mfaToken`. After Zod strips unknown fields, `mfaToken` is always `undefined`. The MFA verification in the wrapper receives `undefined` and the check is bypassed.
- **Fix:** Change `req.body.mfaToken` → `req.body.token` in `auth.controller.ts:disableMfa`.

---

### Security — High

#### S6 · CORP header disables cross-origin resource protection
- **File:** `src/middleware/security.ts:32`
- **Issue:** `crossOriginResourcePolicy: { policy: 'cross-origin' }` allows any cross-origin embedder to load API responses as subresources, defeating CORP.
- **Fix:** Change to `{ policy: 'same-origin' }`. This is appropriate for a pure JSON API with no asset-serving.

#### S7 · `requireOrganization` trusts `organizationId` from request body
- **File:** `src/middleware/auth.ts:162`
- **Issue:** The middleware resolves the target org from `req.body.organizationId` as a fallback. A client can override the intended organization by injecting a different ID into the body.
- **Fix:** Remove `req.body.organizationId` from the org lookup chain. Only `organizationId` passed as a direct argument or `req.params.organizationId` should be trusted.

---

### Code Quality

#### Q1 · `console.log` and misplaced import in context middleware
- **File:** `src/middleware/context.ts`
- **Issue:** `console.log()` is used for request completion logging instead of `@hermit/logger`. The `import config from '../config'` statement appears at line 73 (bottom of the file) — imports must be at the top.
- **Fix:** Move the import to the top. Replace `console.log()` with `log.info()`.

#### Q2 · `console.error` in encryption service
- **File:** `src/services/encryption.service.ts:35`
- **Issue:** `console.error()` used instead of `log.error()` from `@hermit/logger`, breaking log format consistency.
- **Fix:** Replace with `log.error()`.

#### Q3 · Unnecessary `as any` casts in JWT utils
- **File:** `src/utils/jwt.ts:29,44`
- **Issue:** `config.jwt.accessTokenSecret as any` and `config.jwt.refreshTokenSecret as any` are unnecessary — `string` is directly assignable to `jsonwebtoken`'s `Secret` type.
- **Fix:** Remove both `as any` casts.

#### Q4 · `catch (error: any)` in vault health middleware
- **File:** `src/middleware/vault-health.ts:36`
- **Issue:** Catching with `error: any` disables TypeScript's type safety in the catch block.
- **Fix:** Change to `catch (error: unknown)` with a type-narrowing guard using `instanceof Error` and `(error as NodeJS.ErrnoException).code`.

#### Q5 · Dynamic `import('bcryptjs')` inside hot-path functions
- **File:** `src/utils/mfa.ts:80,88`
- **Issue:** `await import('bcryptjs')` is called inside `hashBackupCode` and `verifyBackupCode` on every invocation, forcing module resolution on each call.
- **Fix:** Convert to a static top-level import.

#### Q6 · Misleading `validateMfaToken` return type — dead code in callers
- **File:** `src/utils/mfa.ts:95`, `src/wrappers/auth.wrapper.ts`, `src/middleware/auth.ts`
- **Issue:** `validateMfaToken` always throws on invalid tokens — it never returns `{ valid: false }`. The `valid: boolean` field in the return type is misleading, and callers have dead `if (!mfaResult.valid)` branches that can never be reached.
- **Fix:** Remove `valid` from the return type: `Promise<{ usedBackupCode: boolean; backupCodeIndex?: number }>`. Remove dead `if (!mfaResult.valid)` checks from `auth.wrapper.ts` (login) and `auth.ts` (requireMfa).

#### Q7 · Session expiry hardcoded in two places
- **File:** `src/wrappers/auth.wrapper.ts:163,508`
- **Issue:** `7 * 24 * 60 * 60 * 1000` is hardcoded twice instead of using `config.security.sessionDuration` (which already holds this value in ms). Changing the config has no effect on actual session lifetime.
- **Fix:** Replace both literals with `config.security.sessionDuration`.

#### Q8 · `as any` casts on device utils calls
- **File:** `src/wrappers/auth.wrapper.ts:137,141,347`
- **Issue:** `getOrCreateDevice` and `finalizeDeviceEnrollment` are called with `as any` casts to paper over type mismatches between the actual `Request` type and what the functions expect.
- **Fix:** Create a minimal typed adapter object `{ ip, headers: { 'user-agent': userAgent } }` typed as `Pick<Request, 'ip' | 'headers'>` (or a local interface) instead of casting.

#### Q9 · Registration logged as a LOGIN event
- **File:** `src/wrappers/auth.wrapper.ts:166`, `src/services/audit.service.ts`
- **Issue:** `auditLog.login()` is called after user registration. Registration and login are different security events; conflating them makes audit logs unreliable for detecting account-creation abuse.
- **Fix:**
  1. Add `REGISTER` to the `AuditAction` enum in the Prisma schema (`packages/prisma/schema.prisma`).
  2. Run `prisma migrate dev --name add-register-audit-action`.
  3. Add `auditLog.register()` helper to `audit.service.ts`.
  4. Call `auditLog.register()` from `auth.wrapper.ts` after successful registration.

#### Q10 · Unnecessary `as any` in audit service
- **File:** `src/services/audit.service.ts:35,37,98,112`
- **Issue:** `resourceType as any` and `where as any` are used to work around Prisma generated type mismatches. These hide potential type errors.
- **Fix:** Use the correct Prisma input types (`Prisma.AuditLogCreateInput`, `Prisma.AuditLogWhereInput`) to eliminate the casts.

#### Q11 · Untyped return on `createWriteAppRoleConfig`
- **File:** `src/server.ts:35`
- **Issue:** `createWriteAppRoleConfig(): any` — the return type is `any`, losing type safety for the vault config object.
- **Fix:** Type the return as `{ roleId: string; secretId?: string; wrappedSecretId?: string } | undefined`.

---

### Inconsistencies

#### I1 · Silent body mutation in secret route pipeline
- **File:** `src/routes/secret.routes.ts:222,239`
- **Issue:** `req.body.cliScope = true` is set via inline middleware mutation in two routes. Mutating `req.body` mid-pipeline is fragile and invisible to downstream readers of the code.
- **Fix:** Pass `cliScope` via `res.locals.cliScope = true` and read it in the controller, or pass it as an explicit parameter. `res.locals` is the Express-idiomatic channel for per-request data set by middleware.

#### I2 · No `REGISTER` audit action (covered by Q9 above)

#### I3 · URN wildcard matching uses unsanitised regex
- **File:** `src/services/policy-engine.ts:36`
- **Issue:** `new RegExp("^" + pattern.replace(/\*/g, ".*") + "$")` is built from policy resource strings without escaping regex metacharacters. A pattern like `urn:hermit:org:*.vault.*` would misinterpret `.` as "any character". Current URNs are safe, but this is a latent bug.
- **Fix:** Escape all regex metacharacters in the pattern before replacing `*` with `.*`:
  ```ts
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexPattern = "^" + escaped.replace(/\\\*/g, '.*') + "$";
  ```
  This is a non-breaking change — existing URN patterns contain no metacharacters.

---

## Implementation Passes

Changes are grouped into four sequential passes so each can be reviewed independently.

### Pass 1 — Critical + High Security (S1–S7)
Files: `secret.routes.ts`, `server.ts`, `utils/password.ts`, `utils/mfa.ts`, `controllers/auth.controller.ts`, `middleware/security.ts`, `middleware/auth.ts`

### Pass 2 — Code Quality: utilities and middleware (Q1–Q5)
Files: `middleware/context.ts`, `services/encryption.service.ts`, `utils/jwt.ts`, `middleware/vault-health.ts`, `utils/mfa.ts`

### Pass 3 — Code Quality: wrapper and service layer (Q6–Q11)
Files: `wrappers/auth.wrapper.ts`, `services/audit.service.ts`, `server.ts`, `middleware/auth.ts`, `packages/prisma/schema.prisma` (migration)

### Pass 4 — Inconsistencies (I1, I3)
Files: `routes/secret.routes.ts`, `controllers/secret.controller.ts`, `services/policy-engine.ts`

---

## What Is Not Changing

- No route restructuring
- No new npm dependencies
- No auth flow changes beyond the S5 bug fix
- No Prisma schema changes beyond adding `REGISTER` to `AuditAction`
- No changes to the CLI, web app, or shared packages (except the Prisma schema)

---

## Success Criteria

- `npm run -w apps/api check-types` passes with no errors
- `npm run -w apps/api lint` passes with zero warnings
- `npm run -w apps/api test` passes (no regressions)
- All `Math.random()` calls removed from security-sensitive utilities
- All `as any` casts eliminated or replaced with typed alternatives
- All `console.log/error` calls replaced with structured logger
- MFA disable correctly verifies the MFA token before proceeding
- Audit log shows distinct `REGISTER` events separate from `LOGIN`
