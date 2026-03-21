#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:=https://127.0.0.1:8200}"
: "${VAULT_SKIP_VERIFY:=false}"
: "${VAULT_WRAP_TTL:=15m}"

export VAULT_ADDR
export VAULT_SKIP_VERIFY

role_name="${1:-}"
if [ -z "$role_name" ]; then
  echo "Usage: issue-wrapped-secret-id.sh <approle-name>" >&2
  exit 1
fi

vault write -wrap-ttl="$VAULT_WRAP_TTL" -f "auth/approle/role/${role_name}/secret-id" -format=json | jq -r '.wrap_info.token'
