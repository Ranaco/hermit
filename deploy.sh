#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Hermit KMS — VPS Deployment Script
# ============================================
#
# Prerequisites (run once on VPS):
#   apt update && apt install -y docker.io docker-compose-plugin git gettext-base
#   systemctl enable --now docker
#
# DNS:
#   Add A record: Host=<subdomain>  Value=<VPS IP>  TTL=Automatic
#
# Usage:
#   DOMAIN=kms.example.com EMAIL=admin@example.com bash deploy.sh
#   -- or --
#   bash deploy.sh --domain kms.example.com --email admin@example.com
#   -- or --
#   bash deploy.sh   (interactive prompts)
#
# ============================================

APP_DIR="/opt/hermit"
COMPOSE_FILE="docker-compose.prod.yml"

# ── Parse CLI args ────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2";  shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Prompt if not provided ────────────────────
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

cd "$APP_DIR"

# ── 1. Generate nginx config from template ───
echo "Generating nginx config for $DOMAIN..."
envsubst '${DOMAIN}' < nginx/conf.d/hermit.conf.template > nginx/conf.d/hermit.conf

# ── 2. Environment file ───────────────────────
if [ ! -f .env.production ]; then
  echo "Creating .env.production from template..."
  cp .env.production.example .env.production

  # Generate secrets automatically
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  PG_PASSWORD=$(openssl rand -hex 32)

  sed -i "s|CHANGE_ME_generate_with_openssl|${JWT_SECRET}|" .env.production
  sed -i "0,/JWT_REFRESH_SECRET=.*/s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env.production
  sed -i "s|CHANGE_ME_strong_random_password|${PG_PASSWORD}|" .env.production

  echo "Generated .env.production with random secrets."
  echo "Generated .env.production — review with: nano .env.production"
fi

# Source env for variable substitution
set -a
source .env.production
set +a

# ── 3. Create directories ─────────────────────
mkdir -p nginx/conf.d

# ── 4. SSL certificate (first time) ──────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Obtaining SSL certificate for $DOMAIN..."

  # Start nginx temporarily for ACME challenge
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

  docker compose -f "$COMPOSE_FILE" up -d nginx
  sleep 3

  # Run certbot
  docker compose -f "$COMPOSE_FILE" run --rm certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

  # Remove temp config and stop nginx
  rm -f nginx/conf.d/hermit-temp.conf
  docker compose -f "$COMPOSE_FILE" down
fi

# ── 5. Build and start all services ──────────
echo "Building and starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production build
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d

# ── 6. Wait for database ─────────────────────
echo "Waiting for database to be ready..."
until docker compose -f "$COMPOSE_FILE" exec db pg_isready -U "$POSTGRES_USER" 2>/dev/null; do
  sleep 2
done

# ── 7. Run Prisma migrations ─────────────────
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec api \
  npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma

# ── 8. Health check ───────────────────────────
echo ""
echo "Waiting for services to start..."
sleep 5

echo "Checking health..."
if curl -sf "http://localhost/health" > /dev/null 2>&1; then
  echo "API is healthy!"
else
  echo "Warning: Health check failed. Check logs with:"
  echo "  docker compose -f $COMPOSE_FILE logs api"
fi

echo ""
echo "============================================"
echo "  Hermit KMS deployed at https://$DOMAIN"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Initialize Vault: docker compose -f $COMPOSE_FILE exec hcv vault operator init"
echo "  2. Unseal Vault (3 keys): docker compose -f $COMPOSE_FILE exec hcv vault operator unseal"
echo "  3. Enable AppRole and Transit engine (see docs)"
echo "  4. Add VAULT_ROLE_ID and VAULT_SECRET_ID to .env.production"
echo "  5. Restart API: docker compose -f $COMPOSE_FILE restart api"
echo ""
echo "Logs:  docker compose -f $COMPOSE_FILE logs -f"
echo "Stop:  docker compose -f $COMPOSE_FILE down"
