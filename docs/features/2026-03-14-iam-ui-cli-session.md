# Hermes Session Handoff: IAM, Policy Builder, Dashboard, And CLI

> Last Updated: `2026-03-14`
> Scope: web UI, IAM engine, policy builder, invitations, dashboard, secrets UX, CLI injection/runtime

This document captures the major work completed in this session so future work can continue without re-tracing the full thread.

## 1. Web UI System Cleanup

The dashboard shell and core app surfaces were cleaned up to use a flatter, quieter control-plane style.

Main outcomes:

- reduced decorative glass/morphism styling across the app
- aligned header, sidebar, and body layout into a consistent shell
- cleaned modal semantics and overflow behavior
- reduced copy density across auth and dashboard screens
- fixed several sidebar and collapsed-rail UI issues

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\dashboard-layout.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\auth-shell.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\globals.css`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\ui\dialog.tsx`

## 2. Workspace Dashboard And Invitation Visibility

The dashboard was redesigned as a workspace-first home for the selected organization and vault.

Implemented:

- real dashboard panels for recent activity, keys, secrets, and invites
- org-only and no-org empty states
- inbound pending invites for the signed-in user
- outbound pending invites for the active organization
- invite revoke and copy-link support on org management surfaces

IAM additions:

- `organizations:invitations:read`
- `organizations:invitations:create`
- `organizations:invitations:revoke`

Defaults:

- `OWNER` and `ADMIN` now receive invite permissions via managed baseline policies
- `MEMBER` does not get invite permissions by default

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\api\src\services\organization-iam.service.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\routes\organization.routes.ts`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\page.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\organizations\page.tsx`

## 3. Secret Version Model And Secret Detail Page

Secret version behavior was aligned to the intended model:

- the secret has a current version pointer
- the latest stored version is not always the current one
- an older version can be promoted back to current without rewriting history

Implemented:

- backend support for current-version semantics
- secret reveal uses current version by default
- version history supports promoting older versions to current
- new secret detail page for full secret management

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\api\src\wrappers\secret.wrapper.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\controllers\secret.controller.ts`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\secrets\[id]\page.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\services\secret.service.ts`

## 4. Vault Password Support In Web UI

Vault passwords already existed in the backend and CLI. The web UI was updated to support vault creation with an optional password.

Implemented:

- optional vault password field
- confirm-password field
- mismatch validation
- minimum length validation

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\vaults\page.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\services\vault.service.ts`

## 5. Frontend Permission Gating Cleanup

The web app was re-tested with a restricted member account and cleaned up so the UI better reflects actual access.

Implemented:

- removed restricted nav items when the user lacks access
- hid forbidden create/manage actions on dashboard pages
- added proper restricted-access state for policies page
- stopped unnecessary forbidden data fetches for invitation/policy panels
- fixed stale org/vault context on account switches

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\hooks\use-rbac.ts`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\dashboard-layout.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\hooks\use-auto-context.ts`

Important limitation:

- frontend gating is still baseline-role-oriented and is not yet fully custom-policy-aware
- the API remains authoritative and correctly enforced

## 6. IAM Revamp For Folder-Scoped Access

The IAM engine was expanded so a role can target a secret folder subtree and automatically inherit access to descendant folders and secrets.

Implemented:

- `SecretGroup.path` and `SecretGroup.depth`
- folder subtree resource semantics:
  - exact folder: `urn:hermes:org:ORG:vault:VAULT:group:GROUP`
  - subtree folder: `urn:hermes:org:ORG:vault:VAULT:group:GROUP:subtree`
- candidate-resource policy evaluation
- subtree-aware folder and secret authorization in wrappers and routes

Security preserved:

- `DENY > ALLOW`
- owner bypass unchanged
- secret password and vault password checks unchanged
- existing exact-resource policies still work

Important files:

- `C:\Users\ranas\Code\web\hermes\packages\prisma\schema.prisma`
- `C:\Users\ranas\Code\web\hermes\packages\prisma\migrations\20260314193000_add_secret_group_paths\migration.sql`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\services\iam-resource.service.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\services\policy-engine.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\wrappers\secret-group.wrapper.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\wrappers\secret.wrapper.ts`

## 7. Policy Page And Builder Revamp

The policies page and editor were rebuilt to be more usable for real IAM authoring.

Page changes:

- policies moved from stretched cards into a more structured list/table layout
- badge clutter now collapses into overflow badges like `+7 more`
- create/edit/review happens in modal-based flows

Builder changes:

- supports multiple ALLOW rules
- supports scoped rules for:
  - workspace
  - single vault
  - folder subtree
  - specific secrets
- exact secret targeting now supports multi-select
- builder now keeps local draft rules so incomplete rules do not disappear mid-edit
- empty new rules start with a default action so `Add Rule` always creates a visible row

Raw mode remains necessary for:

- DENY-heavy policies
- unsupported advanced shapes
- legacy cases the structured builder cannot fully model

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\web\src\app\dashboard\policies\page.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\policy-editor.tsx`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\components\ui\switch.tsx`

## 8. Policy Builder Folder Picker Fix

The subtree folder picker originally showed an empty list because the builder was hitting the normal group read route and getting `403`.

Implemented:

- `forPolicyBuilder=true` fetch mode end to end
- policy-authoring permission path for subtree folder loading
- full folder tree loading for builder scope selection

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\api\src\validators\secret-group.validator.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\routes\secret-group.routes.ts`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\services\secret-group.service.ts`
- `C:\Users\ranas\Code\web\hermes\apps\web\src\hooks\use-secret-groups.ts`

Operational note:

- if the local API dev process is stale, restart it before retesting subtree scope selection

## 9. CLI Injection And Runtime Improvements

The CLI runtime flow was extended so `hermes run` is the main ephemeral injection command with permission-aware resolution.

Implemented:

- `hermes run --inject <target> -- <command>`
- permission-aware resolution for vaults, folders, and secrets
- folder and secret path resolution constrained to accessible resources
- recursive folder injection via group or full folder path
- exact secret injection
- collision detection for duplicate env var names
- injected values remain child-process-only
- parent shell environment is not mutated

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\cli\src\commands\run.ts`
- `C:\Users\ranas\Code\web\hermes\apps\cli\src\lib\context.ts`
- `C:\Users\ranas\Code\web\hermes\apps\cli\src\lib\sdk.ts`
- `C:\Users\ranas\Code\web\hermes\apps\cli\src\lib\process-runner.ts`

Behavior note:

- `--inject something` is intentionally ambiguous for a single-segment target
- use `--group something` for a top-level folder
- use `--inject folder/path/secret` for a full path target

## 10. CLI ID Prefix And Secret Lookup Improvements

CLI selectors were expanded so short unique ID prefixes work across more commands.

Implemented:

- unique ID-prefix resolution for orgs, vaults, keys, groups, and secrets
- `hermes secret get` and `hermes secret delete` accept:
  - exact name
  - full ID
  - short unique ID prefix

Additional fix:

- exact-secret CLI access under narrow IAM policies now works without requiring broad vault-secret list access

Important files:

- `C:\Users\ranas\Code\web\hermes\apps\cli\src\lib\context.ts`
- `C:\Users\ranas\Code\web\hermes\apps\cli\src\commands\secret.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\routes\secret.routes.ts`
- `C:\Users\ranas\Code\web\hermes\apps\api\src\wrappers\secret.wrapper.ts`

## 11. Windows CLI Runtime Fix

During live testing, `hermes run` was found to break quoted commands on Windows because the runner used `shell: true`.

Implemented:

- switched to direct child-process spawning
- added Windows command resolution for plain commands like `node`
- preserved child-only environment injection
- removed the quoting breakage for `node -e ...`

Important file:

- `C:\Users\ranas\Code\web\hermes\apps\cli\src\lib\process-runner.ts`

## 12. Safe Authorization Error Messaging

Denied CLI/API lookups were echoing candidate resource URNs back in the error text, which could leak exact secret IDs during rejected access attempts.

Implemented:

- policy middleware now returns a generic insufficient-permissions message

Important file:

- `C:\Users\ranas\Code\web\hermes\apps\api\src\middleware\policy.ts`

## 13. Live Validation Completed

The following live CLI scenarios were tested with a restricted user under a custom scoped role:

- exact allowed root secret reveal by short ID prefix
- subtree folder listing for an allowed folder
- subtree secret listing under the allowed folder
- exact secret injection via `--secret`
- subtree injection via `--group`
- exact folder/secret path injection via `--inject folder/secret`
- denial of a secret outside the allowed scope
- parent shell remained clean after the child process exited

The following scoped test entities were created during validation:

- custom policy: `CLI Scoped Access 20260314`
- custom role: `CLI Scoped Role 20260314`
- test user: `cli.scope.20260314@example.com`
- test secret in folder `something`: `folder_cli_secret`

These can be cleaned up later if no longer needed.

## 14. Migrations And Build Notes

Relevant migration introduced in this session:

- `C:\Users\ranas\Code\web\hermes\packages\prisma\migrations\20260314193000_add_secret_group_paths\migration.sql`

Builds run successfully during this session:

- `npm run build --workspace @hermes/web`
- `npm run build --workspace @hermes/api`
- `npm run build --workspace @hermes/cli`
- `npm run check-types --workspace @hermes/api`
- `npm run check-types --workspace @hermes/cli`

Existing warnings still present and not introduced by this session:

- `baseline-browser-mapping` staleness warning in web builds
- `@jest/globals` import warnings during API tsup build from `src/__tests__/server.test.ts`

## 15. Known Remaining Gaps

- frontend permission gating is still not fully custom-policy-aware
- structured policy builder still does not replace Raw mode for advanced DENY policies
- `--inject` intentionally remains ambiguous for single-segment folder names
- some feature work from this session spans many UI cleanup tweaks that are not individually enumerated here, but the main architectural outcomes are captured above
