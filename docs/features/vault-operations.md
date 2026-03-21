# Vault Operations

## Runtime model

- `apps/hcv_engine/scripts/start.sh` starts Vault only.
- Vault initialization and provisioning are explicit operator actions.
- Normal container restarts must not trigger bootstrap or provisioning logic.

## Bootstrap flow

1. Start the stack with `db`, `hcv`, `nginx`, and `certbot`.
2. Verify TLS assets are mounted in `vault/tls/`.
3. Run `/vault/scripts/bootstrap-vault.sh`.
4. Store the generated initialization material offline.
5. If auto-unseal is disabled, unseal Vault manually.
6. Run `/vault/scripts/provision-vault.sh` with an operator-controlled bootstrap token.
7. Revoke the bootstrap token after provisioning.

## App auth model

- Applications should use scoped AppRoles.
- Prefer `VAULT_APPROLE_WRAPPED_SECRET_ID_*` over static `VAULT_APPROLE_SECRET_ID_*`.
- Wrapped SecretIDs are one-time handoff material and should be rotated regularly.

## Backups

- Use `/vault/scripts/backup-raft-snapshot.sh` for encrypted Raft snapshots.
- Keep snapshots off-host with retention managed outside the container.
- Test snapshot restore procedures separately from production.
