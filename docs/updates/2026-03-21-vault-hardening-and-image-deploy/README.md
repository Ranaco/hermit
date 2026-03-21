# Vault Hardening and Image Deploy Update

## Completed in repo

- Added image-based production deployment flow centered on `/deploy/hermit`, `docker-compose.deploy.yml`, and the GitHub Actions deploy workflow.
- Refactored `apps/hcv_engine` so normal container startup only starts Vault.
- Split Vault operator workflows into explicit scripts:
  - `bootstrap-vault.sh`
  - `provision-vault.sh`
  - `issue-wrapped-secret-id.sh`
  - `backup-raft-snapshot.sh`
- Removed webhook-based root token and unseal handling from the Vault wrapper.
- Switched Vault runtime config to TLS-first listener settings and added auto-unseal-ready AWS KMS seal support via environment variables.
- Updated production compose files to mount Vault TLS, audit, init, and backup directories explicitly.
- Updated API Vault auth config to accept wrapped AppRole SecretIDs and removed the hardcoded Vault token fallback.
- Added repo placeholders for `vault/tls`, `vault/init`, `vault/backups`, and `vault/audit`.

## Operator actions still required

- Populate `vault/tls/` on the VPS with `tls.crt`, `tls.key`, and `ca.pem`.
- Provide production `.env.production` values for Vault TLS, AppRole, backup, and optional auto-unseal settings.
- Run first-time Vault bootstrap explicitly:
  - `docker compose -f docker-compose.deploy.yml --env-file .env.production exec -T hcv /vault/scripts/bootstrap-vault.sh`
- If Vault is not using auto-unseal, unseal it manually as part of bootstrap.
- Run first-time Vault provisioning explicitly with an operator-controlled bootstrap token:
  - `docker compose -f docker-compose.deploy.yml --env-file .env.production exec -T hcv /vault/scripts/provision-vault.sh`
- Store bootstrap output and recovery material offline. Do not keep it in the deployment directory after custody transfer.
- Configure off-host encrypted snapshot shipping if `VAULT_BACKUP_REMOTE_URI` is required.

## Intentional behavior changes

- Deployments now fail fast if Vault is uninitialized or sealed instead of trying to self-heal during normal startup.
- Root credentials are no longer part of routine deployment.
- App services are expected to authenticate to Vault with scoped non-root AppRoles.
- Wrapped SecretIDs are preferred for deployment-time secret handoff.

## Follow-up work

- Exercise the full bootstrap, sealed restart, and snapshot restore runbooks in a disposable environment.
- Rotate any bootstrap credentials or SecretIDs that were exposed by the old webhook flow.
- Add a scheduler on the VPS for `backup-raft-snapshot.sh`.
- Move from manual wrapped SecretID placement toward a tighter host-local unwrap handoff if desired.

## Post-update deployment note

- First-time Let's Encrypt issuance must bootstrap nginx with an HTTP-only ACME challenge config. Rendering the full SSL config before the cert exists causes nginx startup failure because `fullchain.pem`/`privkey.pem` are not present yet.
- Because Certbot state is stored in the Docker `certbot_conf` volume, deployment checks must query Certbot/container state rather than host `/etc/letsencrypt/live/...`.
- One-off Certbot commands in this stack must override the service entrypoint. `docker compose run certbot ...` otherwise executes the renew loop entrypoint instead of the requested subcommand.
