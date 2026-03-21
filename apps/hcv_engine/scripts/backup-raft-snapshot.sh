#!/usr/bin/env sh
set -eu

: "${VAULT_ADDR:=https://127.0.0.1:8200}"
: "${VAULT_SKIP_VERIFY:=false}"
: "${VAULT_BACKUP_DIR:=/vault/backups}"
: "${VAULT_SNAPSHOT_PASSPHRASE_FILE:=}"

export VAULT_ADDR
export VAULT_SKIP_VERIFY

if [ -z "$VAULT_SNAPSHOT_PASSPHRASE_FILE" ] || [ ! -f "$VAULT_SNAPSHOT_PASSPHRASE_FILE" ]; then
  echo "VAULT_SNAPSHOT_PASSPHRASE_FILE must point to a readable passphrase file." >&2
  exit 1
fi

mkdir -p "$VAULT_BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot_file="$VAULT_BACKUP_DIR/raft-${timestamp}.snap"
encrypted_file="${snapshot_file}.enc"

vault operator raft snapshot save "$snapshot_file"
openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "$snapshot_file" \
  -out "$encrypted_file" \
  -pass "file:${VAULT_SNAPSHOT_PASSPHRASE_FILE}"
rm -f "$snapshot_file"

if [ -n "${VAULT_BACKUP_REMOTE_URI:-}" ]; then
  if command -v aws >/dev/null 2>&1 && printf '%s' "$VAULT_BACKUP_REMOTE_URI" | grep -q '^s3://'; then
    aws s3 cp "$encrypted_file" "$VAULT_BACKUP_REMOTE_URI/"
  elif command -v rclone >/dev/null 2>&1; then
    rclone copyto "$encrypted_file" "${VAULT_BACKUP_REMOTE_URI}/$(basename "$encrypted_file")"
  else
    echo "No supported remote backup command found for VAULT_BACKUP_REMOTE_URI." >&2
    exit 1
  fi
fi

echo "Encrypted snapshot created at $encrypted_file"
