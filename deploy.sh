#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Hermit KMS - VPS Bootstrap Script
# ============================================
#
# Prerequisites (run once on VPS):
#   apt update && apt install -y docker.io docker-compose-plugin git gettext-base curl
#   systemctl enable --now docker
#
# Usage:
#   DOMAIN=kms.example.com EMAIL=admin@example.com bash deploy.sh
#   -- or --
#   bash deploy.sh --domain kms.example.com --email admin@example.com
#
# Notes:
#   - This script prepares the VPS for image-based deployments.
#   - Application images are pulled from GHCR. They are not built on the VPS.
#
# ============================================

APP_DIR="/deploy/hermit"
COMPOSE_FILE="docker-compose.deploy.yml"
REFRESH_RUNTIME_VAULT_ENV=false
RESTART_APP_SERVICES=false

render_http_only_nginx_config() {
  cat > nginx/conf.d/hermit.conf <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'waiting for ssl';
    }
}
NGINX
}

render_full_nginx_config() {
  envsubst '${DOMAIN}' < nginx/conf.d/hermit.conf.template > nginx/conf.d/hermit.conf
}

cert_exists() {
  docker compose -f "$COMPOSE_FILE" --env-file .env.production run --rm \
    --entrypoint certbot certbot certificates --cert-name "$DOMAIN" >/dev/null 2>&1
}

write_runtime_vault_env() {
  local deploy_token_file="${VAULT_DEPLOY_TOKEN_FILE:-$APP_DIR/vault/init/provisioning/deploy-token}"
  local runtime_env_file="$APP_DIR/.env.runtime"

  if [[ ! -f "$deploy_token_file" ]]; then
    echo "Vault deploy token file not found at $deploy_token_file." >&2
    echo "Provision Vault first so the VPS can mint wrapped AppRole credentials per deploy." >&2
    return 1
  fi

  local deploy_token
  deploy_token="$(tr -d '\r\n' < "$deploy_token_file")"

  local read_role_id
  local write_role_id
  local read_wrapped_secret_id
  local write_wrapped_secret_id

  read_role_id="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T -e VAULT_TOKEN="$deploy_token" hcv vault read -field=role_id auth/approle/role/hermit-read/role-id)"
  write_role_id="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T -e VAULT_TOKEN="$deploy_token" hcv vault read -field=role_id auth/approle/role/hermit-write/role-id)"
  read_wrapped_secret_id="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T -e VAULT_TOKEN="$deploy_token" hcv /vault/scripts/issue-wrapped-secret-id.sh hermit-read | tail -n 1)"
  write_wrapped_secret_id="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T -e VAULT_TOKEN="$deploy_token" hcv /vault/scripts/issue-wrapped-secret-id.sh hermit-write | tail -n 1)"

  cat > "$runtime_env_file" <<EOF
VAULT_APPROLE_ROLE_ID_READ=${read_role_id}
VAULT_APPROLE_WRAPPED_SECRET_ID_READ=${read_wrapped_secret_id}
VAULT_APPROLE_ROLE_ID_WRITE=${write_role_id}
VAULT_APPROLE_WRAPPED_SECRET_ID_WRITE=${write_wrapped_secret_id}
EOF
  chmod 600 "$runtime_env_file"
  echo "Wrote fresh wrapped Vault AppRole credentials to $runtime_env_file"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --refresh-runtime-vault-env) REFRESH_RUNTIME_VAULT_ENV=true; shift ;;
    --restart-app-services) RESTART_APP_SERVICES=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$REFRESH_RUNTIME_VAULT_ENV" == "true" && "$RESTART_APP_SERVICES" == "false" ]]; then
  cd "$APP_DIR"
  write_runtime_vault_env
  exit 0
fi

if [[ "$RESTART_APP_SERVICES" == "true" ]]; then
  cd "$APP_DIR"

  if [[ ! -f .env.release ]]; then
    echo ".env.release is required to restart app services." >&2
    exit 1
  fi

  vault_status="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T hcv vault status -format=json 2>/dev/null || true)"
  if [[ -z "$vault_status" ]]; then
    echo "Unable to query Vault status. Check hcv logs before continuing." >&2
    exit 1
  fi

  if jq -e '.sealed == true' >/dev/null <<<"$vault_status"; then
    echo "Vault is sealed. Unseal it or enable auto-unseal before restarting app services." >&2
    exit 1
  fi

  write_runtime_vault_env
  docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release up -d --force-recreate --no-deps api web
  exit 0
fi

if [[ -z "${DOMAIN:-}" ]]; then
  read -rp "Enter domain (e.g. kms.example.com): " DOMAIN
fi

if [[ -z "${EMAIL:-}" ]]; then
  read -rp "Enter email for SSL certificate (Let's Encrypt): " EMAIL
fi

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Error: DOMAIN and EMAIL are required." >&2
  exit 1
fi

export DOMAIN EMAIL

mkdir -p "$APP_DIR/nginx/conf.d"
mkdir -p "$APP_DIR/vault/tls" "$APP_DIR/vault/init" "$APP_DIR/vault/backups" "$APP_DIR/vault/audit"
cd "$APP_DIR"

if [[ ! -f .env.release ]]; then
  printf 'IMAGE_TAG=%s\n' "${IMAGE_TAG:-latest}" > .env.release
fi

if [[ ! -f .env.runtime ]]; then
  : > .env.runtime
  chmod 600 .env.runtime
fi

echo "Generating nginx config for $DOMAIN..."
render_full_nginx_config

if [[ ! -f .env.production ]]; then
  echo "Creating .env.production from template..."
  cp .env.production.example .env.production

  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  PG_PASSWORD=$(openssl rand -hex 32)

  sed -i "s|CHANGE_ME_generate_with_openssl|${JWT_SECRET}|" .env.production
  sed -i "0,/JWT_REFRESH_SECRET=.*/s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env.production
  sed -i "s|CHANGE_ME_strong_random_password|${PG_PASSWORD}|" .env.production

  echo "Generated .env.production with random secrets."
fi

set -a
source .env.production
set +a

if ! cert_exists; then
  echo "Obtaining SSL certificate for $DOMAIN..."
  render_http_only_nginx_config

  docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d nginx
  sleep 3

  docker compose -f "$COMPOSE_FILE" --env-file .env.production run --rm \
    --entrypoint certbot certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

  docker compose -f "$COMPOSE_FILE" --env-file .env.production down
  render_full_nginx_config
fi

echo "Pulling and starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release pull
docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release up -d db hcv nginx certbot

echo "Waiting for database to be ready..."
until docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T db pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; do
  sleep 2
done

echo "Checking Vault initialization state..."
vault_status="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T hcv vault status -format=json 2>/dev/null || true)"
if [[ -z "$vault_status" ]]; then
  echo "Unable to query Vault status. Check hcv logs before continuing." >&2
  exit 1
fi

if ! jq -e '.initialized == true' >/dev/null <<<"$vault_status"; then
  echo "Vault is running but not initialized." >&2
  echo "Run operator bootstrap explicitly:" >&2
  echo "  docker compose -f $COMPOSE_FILE --env-file .env.production exec -T hcv /vault/scripts/bootstrap-vault.sh" >&2
  exit 1
fi

if jq -e '.sealed == true' >/dev/null <<<"$vault_status"; then
  echo "Vault is sealed. Unseal it or enable auto-unseal before deploying the API." >&2
  exit 1
fi

write_runtime_vault_env

docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release up -d --force-recreate --no-deps api web
docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T nginx nginx -s reload || \
  docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release up -d --force-recreate --no-deps nginx

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production --env-file .env.release exec -T api \
  npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma

echo "Checking health..."
curl -fsS "http://127.0.0.1/health" > /dev/null

echo ""
echo "============================================"
echo "  Hermit KMS prepared at https://$DOMAIN"
echo "============================================"
echo ""
echo "Images are now expected to be deployed by GitHub Actions into $APP_DIR."
