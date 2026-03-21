#!/usr/bin/env sh
set -eu

VAULT_CONFIG_TEMPLATE="${VAULT_CONFIG_TEMPLATE:-/vault/config/config.hcl}"
VAULT_RENDERED_CONFIG="${VAULT_RENDERED_CONFIG:-/tmp/vault-config.hcl}"

: "${VAULT_API_ADDR:=https://hcv:8200}"
: "${VAULT_CLUSTER_ADDR:=https://hcv:8201}"
: "${VAULT_TLS_DISABLE:=false}"
: "${VAULT_TLS_CERT_FILE:=/vault/tls/tls.crt}"
: "${VAULT_TLS_KEY_FILE:=/vault/tls/tls.key}"
: "${VAULT_TLS_CA_FILE:=/vault/tls/ca.pem}"
: "${VAULT_LOG_LEVEL:=info}"

mkdir -p /etc/hashicorp_vault/raft_storage /vault/audit /vault/backups

if [ ! -f "$VAULT_CONFIG_TEMPLATE" ]; then
  echo "Vault config template not found: $VAULT_CONFIG_TEMPLATE" >&2
  exit 1
fi

if [ "$VAULT_TLS_DISABLE" != "true" ]; then
  for file in "$VAULT_TLS_CERT_FILE" "$VAULT_TLS_KEY_FILE" "$VAULT_TLS_CA_FILE"; do
    if [ ! -f "$file" ]; then
      echo "Missing Vault TLS asset: $file" >&2
      exit 1
    fi
  done
fi

envsubst < "$VAULT_CONFIG_TEMPLATE" > "$VAULT_RENDERED_CONFIG"

if [ -n "${VAULT_AUTO_UNSEAL_TYPE:-}" ]; then
  {
    echo ""
    case "$VAULT_AUTO_UNSEAL_TYPE" in
      awskms)
        : "${VAULT_AWSKMS_REGION:?VAULT_AWSKMS_REGION is required for awskms auto-unseal}"
        : "${VAULT_AWSKMS_KMS_KEY_ID:?VAULT_AWSKMS_KMS_KEY_ID is required for awskms auto-unseal}"
        echo 'seal "awskms" {'
        echo "  region     = \"${VAULT_AWSKMS_REGION}\""
        echo "  kms_key_id = \"${VAULT_AWSKMS_KMS_KEY_ID}\""
        if [ -n "${VAULT_AWSKMS_ENDPOINT:-}" ]; then
          echo "  endpoint   = \"${VAULT_AWSKMS_ENDPOINT}\""
        fi
        echo "}"
        ;;
      "")
        ;;
      *)
        echo "Unsupported VAULT_AUTO_UNSEAL_TYPE: $VAULT_AUTO_UNSEAL_TYPE" >&2
        exit 1
        ;;
    esac
  } >> "$VAULT_RENDERED_CONFIG"
fi

exec vault server -config="$VAULT_RENDERED_CONFIG"
