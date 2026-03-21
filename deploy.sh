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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

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

echo "Generating nginx config for $DOMAIN..."
envsubst '${DOMAIN}' < nginx/conf.d/hermit.conf.template > nginx/conf.d/hermit.conf

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

if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  echo "Obtaining SSL certificate for $DOMAIN..."

  cat > nginx/conf.d/hermit-temp.conf <<NGINX
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

  docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d nginx
  sleep 3

  docker compose -f "$COMPOSE_FILE" --env-file .env.production run --rm certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

  rm -f nginx/conf.d/hermit-temp.conf
  docker compose -f "$COMPOSE_FILE" --env-file .env.production down
fi

echo "Pulling and starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production pull
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d db hcv nginx certbot

echo "Waiting for database to be ready..."
until docker compose -f "$COMPOSE_FILE" --env-file .env.production exec -T db pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; do
  sleep 2
done

echo "Checking Vault initialization state..."
vault_status="$(docker compose -f "$COMPOSE_FILE" --env-file .env.production exec -T hcv vault status -format=json 2>/dev/null || true)"
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

docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d api web

echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production exec -T api \
  npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma

echo "Checking health..."
curl -fsS "http://127.0.0.1/health" > /dev/null

echo ""
echo "============================================"
echo "  Hermit KMS prepared at https://$DOMAIN"
echo "============================================"
echo ""
echo "Images are now expected to be deployed by GitHub Actions into $APP_DIR."
