# Hermit KMS Project Context

This file provides system context for AI assistants to align themselves with the architectural patterns, security models, and recent system updates in the Hermit project. Read this to avoid rebuilding features or breaking existing paradigms.

## 1. Vault \u0026 Secret Architecture

- **HashiCorp Vault Transit Engine**: The backend relies on HCV for encryption/decryption of secrets. Prisma models wrap this engine (`secretWrapper.ts`, `keyWrapper.ts`).
- **Entity Hierarchy**: Organizations -\u003e Vaults -\u003e Keys -\u003e Secrets.
- **Entity Selection on Creation**: When users create a Vault or a Key, the frontend forms (`apps/web/src/app/dashboard/vaults/page.tsx`, `keys/page.tsx`) explicitly provide dynamic `<select>` dropdowns for the parent Organization or Vault by calling the `useOrganizations` and `useVaults` React Query hooks. Do not regress into assuming the \"current active context\" is the only parent available.

## 2. IAM Policy Engine & Custom Roles

- **Access Control Model**: The application uses a dynamic Identity and Access Management (IAM) Policy Engine instead of standard static RBAC.
- **Resource URNs**: Every resource (Vault, Secret, Key, SecretGroup) is identified by a unique URN (e.g., `urn:hermit:org:ORG_ID:vault:VAULT_ID:secret:SECRET_ID`).
- **Policy Evaluation**: The `requirePolicy(action, getResourceUrn)` middleware intercepts requests and evaluates the user's assigned custom roles, team roles, and implicitly attached JSON IAM policies to grant or deny access in real-time. Explicit DENY statements always override ALLOW statements.
- **Default Owner Bypass**: Organization `OWNER`s implicitly bypass all policy evaluations and have universal access.

## 3. Three-Tier Security Model for Secrets

Secrets implement a strict three-tier protection model natively supported in the backend `secretWrapper.ts` and validated by Zod schemas:

1. **Secret-level password** (Highest): Required specifically to decrypt the individual secret. The backend intercepts the `/reveal` POST route with `requiresPassword: "secret"`. The frontend (`secrets/page.tsx`) intercepts this 403 and surfaces an inline interactive challenge.
2. **Vault-level password** (Medium): Requires password to access any secret in the vault. Returns `requiresPassword: "vault"`.
3. **Authentication only** (Basic): Requires standard JWT/Cookie user authentication.

_Implementation Note_: Passwords submitted via the UI are encrypted as bcrypt hashes and checked server-side before HCV decryption logic runs. The frontend handles 8-char validation limits natively (e.g. `minLength={8}`).

## 3. API Error Handling \& Validation

- **Zod Schemas**: Used extensively across the API (`validators/`).
- **Express Middleware**: `validation.middleware.ts` intercepts requests and compares against schemas. **Critically**, Zod validation errors must be passed downstream via `return next(new ValidationError(...))` rather than thrown synchronously, to avoid Express 4.x Unhandled Promise Rejection crashes.

## 4. Auth \u0026 Invite Flow

- Organization invites are managed by issuing an invite token.
- `apps/web/src/app/invite/page.tsx` is responsible for auto-accepting tokens on load.
- If a user is unauthenticated when hitting an invite link, the app redirects them to login via a `?returnUrl=` parameter context. The login/register flows respect this parameter to bounce the user right back to their invite acceptance after authenticating.

## 5. Documentation Links

To avoid hallucinating outdated APIs, prioritize the following resources when dealing with these core stack technologies:

- **Next.js (App Router)**: https://nextjs.org/docs
- **Prisma ORM**: https://www.prisma.io/docs
- **Express 4.x**: https://expressjs.com/
- **Zod**: https://zod.dev/

## 6. General Coding Rules & Preferences

- **TypeScript**: Strictly type inputs/outputs. Avoid `any`.
- **Validation**: Pass `ZodError` payloads properly downstream rather than throwing (see Express Middleware section above).
- **Secrets Management**: Do not bypass `encryption.service.ts` when touching Secrets or Keys in Prisma.

## 7. IaC Stack & Database Context

The backend uses **PostgreSQL** configured via Prisma.
Key tables and their core relationships:

- **User**, **Organization**, **OrganizationMember**: Tracks tenant-level access.
- **Vault**: Has `organizationId`. Contains many `Key`s and `Secret`s.
- **Key**: Has `vaultId`. Contains many `KeyVersion`s. Defines `valueType` (STRING, JSON, etc).
- **Secret**: Has `vaultId` and `keyId`. Tracks `passwordHash` for the extra protection tier.
- **SecretVersion**: Has `secretId`. Contains the `encryptedValue` and `encryptionContext`.
- **Policy**, **OrganizationRole**, **RolePolicyAttachment**, **TeamRoleAssignment**: Tracks dynamic IAM permissions, custom roles, and groups.

## 8. Workflow & Threads

- **New Threads for New Contexts**: To keep the context window unpolluted, start a new AI thread when switching from feature development to bug fixing, or when starting a completely different branch of work.
- **Continual Learning**: Whenever a complex failure occurs or a project-specific preference is established, append an explanation directly into this very file (`AGENTS.md`) so the context is preserved for future sessions.

## 9. Deployment & Vault Operations

- **Image-based deploys**: Production deploys target `/deploy/hermit` and must use `docker-compose.deploy.yml` with prebuilt GHCR images. Normal releases should not build app images on the VPS.
- **Vault runtime split**: `apps/hcv_engine/scripts/start.sh` must stay runtime-only. Vault initialization and provisioning are explicit operator workflows handled by `bootstrap-vault.sh` and `provision-vault.sh`, never by container startup.
- **No webhook recovery path**: Root tokens, unseal keys, recovery JSON, and similar bootstrap material must not be sent through webhook automation or stored as normal deploy artifacts.
- **Wrapped AppRole inputs**: Production app auth should prefer scoped AppRole RoleIDs plus wrapped SecretIDs over static SecretIDs or long-lived root tokens.
- **ACME bootstrap rule**: Do not load the full HTTPS nginx config before the first Let's Encrypt certificate exists. For initial issuance, serve only the HTTP challenge config, then render the SSL config after Certbot succeeds. Certificate existence checks must use the Certbot volume/container state, not host `/etc/letsencrypt` paths.
- **Certbot compose gotcha**: The `certbot` service entrypoint is the long-running renew loop. One-off commands like `certonly` and `certificates` must override the entrypoint (for example `docker compose run --entrypoint certbot ...`) or they will silently run renew logic instead.
- **Wrapped AppRole restart rule**: Production app restarts must mint fresh wrapped SecretIDs into `.env.runtime` and force-recreate the `api`/`web` containers. Updating `.env.runtime` alone does not guarantee Docker Compose will recreate containers or drop stale in-memory env values.
