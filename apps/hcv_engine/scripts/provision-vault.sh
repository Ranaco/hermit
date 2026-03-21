#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:=https://127.0.0.1:8200}"
: "${VAULT_SKIP_VERIFY:=false}"
: "${VAULT_TRANSIT_MOUNT:=transit}"
: "${VAULT_KV_MOUNT:=secret}"
: "${VAULT_POLICY_DIR:=/vault/config}"
: "${VAULT_AUDIT_LOG_PATH:=/vault/audit/audit.log}"
: "${VAULT_OPERATOR_OUTPUT_DIR:=/vault/init/provisioning}"
: "${VAULT_WRAP_TTL:=15m}"
: "${VAULT_REVOKE_BOOTSTRAP_TOKEN:=true}"

export VAULT_ADDR
export VAULT_SKIP_VERIFY

bootstrap_token="${VAULT_BOOTSTRAP_TOKEN:-}"
if [ -z "$bootstrap_token" ] && [ -n "${VAULT_BOOTSTRAP_TOKEN_FILE:-}" ] && [ -f "${VAULT_BOOTSTRAP_TOKEN_FILE}" ]; then
  bootstrap_token="$(tr -d '\r\n' < "${VAULT_BOOTSTRAP_TOKEN_FILE}")"
fi

if [ -z "$bootstrap_token" ]; then
  echo "Provide VAULT_BOOTSTRAP_TOKEN or VAULT_BOOTSTRAP_TOKEN_FILE to provision Vault." >&2
  exit 1
fi

status_json="$(vault status -format=json 2>/dev/null || true)"
if [ -z "$status_json" ] || ! echo "$status_json" | jq -e '.initialized == true' >/dev/null 2>&1; then
  echo "Vault is not initialized. Run bootstrap-vault.sh first." >&2
  exit 1
fi

if echo "$status_json" | jq -e '.sealed == true' >/dev/null 2>&1; then
  echo "Vault is sealed. Unseal it or enable auto-unseal before provisioning." >&2
  exit 1
fi

mkdir -p "$VAULT_OPERATOR_OUTPUT_DIR"

echo "$bootstrap_token" | vault login -no-print - >/dev/null

vault audit enable file file_path="$VAULT_AUDIT_LOG_PATH" >/dev/null 2>&1 || true
vault auth enable approle >/dev/null 2>&1 || true
vault secrets enable "$VAULT_TRANSIT_MOUNT" >/dev/null 2>&1 || true
vault secrets enable -path="$VAULT_KV_MOUNT" kv-v2 >/dev/null 2>&1 || true

vault policy write hermit-transit "$VAULT_POLICY_DIR/transit-policy.hcl"
vault policy write hermit-read "$VAULT_POLICY_DIR/read_only.hcl"
vault policy write hermit-write "$VAULT_POLICY_DIR/write-policy.hcl"
vault policy write hermit-admin "$VAULT_POLICY_DIR/admin-policy.hcl"

vault write auth/approle/role/hermit-read \
  token_policies="hermit-read" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=24h \
  secret_id_num_uses=10 >/dev/null

vault write auth/approle/role/hermit-write \
  token_policies="hermit-write,hermit-transit" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=24h \
  secret_id_num_uses=10 >/dev/null

vault write auth/approle/role/hermit-admin \
  token_policies="hermit-admin" \
  token_ttl=1h \
  token_max_ttl=8h \
  secret_id_ttl=30m \
  secret_id_num_uses=2 >/dev/null

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
read_role_id="$(vault read -field=role_id auth/approle/role/hermit-read/role-id)"
write_role_id="$(vault read -field=role_id auth/approle/role/hermit-write/role-id)"
admin_role_id="$(vault read -field=role_id auth/approle/role/hermit-admin/role-id)"
read_wrapped_secret_id="$(vault write -wrap-ttl="$VAULT_WRAP_TTL" -f auth/approle/role/hermit-read/secret-id -format=json | jq -r '.wrap_info.token')"
write_wrapped_secret_id="$(vault write -wrap-ttl="$VAULT_WRAP_TTL" -f auth/approle/role/hermit-write/secret-id -format=json | jq -r '.wrap_info.token')"
admin_wrapped_secret_id="$(vault write -wrap-ttl="$VAULT_WRAP_TTL" -f auth/approle/role/hermit-admin/secret-id -format=json | jq -r '.wrap_info.token')"

summary_file="$VAULT_OPERATOR_OUTPUT_DIR/approle-bootstrap-${timestamp}.env"
cat > "$summary_file" <<EOF
VAULT_ADDR=${VAULT_ADDR}
VAULT_TRANSIT_MOUNT=${VAULT_TRANSIT_MOUNT}
VAULT_APPROLE_ROLE_ID_READ=${read_role_id}
VAULT_APPROLE_WRAPPED_SECRET_ID_READ=${read_wrapped_secret_id}
VAULT_APPROLE_ROLE_ID_WRITE=${write_role_id}
VAULT_APPROLE_WRAPPED_SECRET_ID_WRITE=${write_wrapped_secret_id}
VAULT_ADMIN_ROLE_ID=${admin_role_id}
VAULT_ADMIN_WRAPPED_SECRET_ID=${admin_wrapped_secret_id}
EOF
chmod 600 "$summary_file"

if [ "$VAULT_REVOKE_BOOTSTRAP_TOKEN" = "true" ]; then
  vault token revoke -self >/dev/null
fi

echo "Vault provisioning completed."
echo "Wrapped AppRole bootstrap material written to $summary_file"
echo "Distribute only via operator-controlled channels and rotate wrapped SecretIDs on demand."
