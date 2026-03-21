#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:=https://127.0.0.1:8200}"
: "${VAULT_SKIP_VERIFY:=false}"
: "${VAULT_INIT_OUTPUT_DIR:=/vault/init}"
: "${VAULT_INIT_MODE:=shamir}"
: "${VAULT_KEY_SHARES:=5}"
: "${VAULT_KEY_THRESHOLD:=3}"
: "${VAULT_RECOVERY_SHARES:=5}"
: "${VAULT_RECOVERY_THRESHOLD:=3}"

export VAULT_ADDR
export VAULT_SKIP_VERIFY

status_json="$(vault status -format=json 2>/dev/null || true)"
if [ -n "$status_json" ] && echo "$status_json" | jq -e '.initialized == true' >/dev/null 2>&1; then
  echo "Vault is already initialized. Bootstrap skipped."
  exit 0
fi

mkdir -p "$VAULT_INIT_OUTPUT_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
output_file="$VAULT_INIT_OUTPUT_DIR/init-${timestamp}.json"

set -- vault operator init -format=json

if [ "$VAULT_INIT_MODE" = "auto-unseal" ]; then
  set -- "$@" \
    "-recovery-shares=${VAULT_RECOVERY_SHARES}" \
    "-recovery-threshold=${VAULT_RECOVERY_THRESHOLD}"
else
  set -- "$@" \
    "-key-shares=${VAULT_KEY_SHARES}" \
    "-key-threshold=${VAULT_KEY_THRESHOLD}"
fi

if [ -n "${VAULT_INIT_PGP_KEYS:-}" ]; then
  set -- "$@" "-pgp-keys=${VAULT_INIT_PGP_KEYS}"
fi

if [ -n "${VAULT_ROOT_TOKEN_PGP_KEY:-}" ]; then
  set -- "$@" "-root-token-pgp-key=${VAULT_ROOT_TOKEN_PGP_KEY}"
fi

if [ -z "${VAULT_INIT_PGP_KEYS:-}" ] && [ "${VAULT_ALLOW_PLAINTEXT_INIT_OUTPUT:-false}" != "true" ]; then
  echo "Refusing to write plaintext init output. Set VAULT_INIT_PGP_KEYS or explicitly allow plaintext for a controlled one-off bootstrap." >&2
  exit 1
fi

"$@" > "$output_file"
chmod 600 "$output_file"

echo "Vault initialization material written to $output_file"
echo "Move the file to operator-controlled offline storage before continuing."
if [ "$VAULT_INIT_MODE" != "auto-unseal" ]; then
  echo "Vault still requires operator unseal before provisioning."
fi
