#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Hermit KMS — VPS Deployment Script
# ============================================
#
# Prerequisites (run once on VPS):
#   apt update && apt install -y docker.io docker-compose-plugin git
#   systemctl enable --now docker
#
# DNS (Namecheap):
#   Add A record: Host=hermit  Value=<VPS IP>  TTL=Automatic
#
# Usage:
#   1. SSH into VPS:  ssh root@ssh.ranax.co
#   2. Clone repo:    git clone https://github.com/Ranaco/hermit.git /opt/hermit && cd /opt/hermit
#   3. Run:           bash deploy.sh
#
# ============================================

DOMAIN="hermit.ranax.co"
EMAIL="admin@ranax.co"          # change to your email for Certbot
APP_DIR="/opt/hermit"
COMPOSE_FILE="docker-compose.prod.yml"

cd "$APP_DIR"

# ── 1. Environment file ──────────────────────
if [ ! -f .env.production ]; then
  echo "Creating .env.production from template..."
  cp .env.production.example .env.production

  # Generate secrets automatically
  JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
  PG_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

  sed -i "s|CHANGE_ME_generate_with_openssl|${JWT_SECRET}|" .env.production
  # Second occurrence for refresh secret
  sed -i "0,/JWT_REFRESH_SECRET=.*/s|JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|" .env.production
  sed -i "s|CHANGE_ME_strong_random_password|${PG_PASSWORD}|" .env.production

  echo "Generated .env.production with random secrets."
  echo "Review it before continuing: nano .env.production"
  echo ""
  read -p "Press Enter to continue after reviewing .env.production..."
fi

# Source env for variable substitution
set -a
source .env.production
set +a

# ── 2. Create directories ────────────────────
mkdir -p nginx/conf.d

# ── 3. SSL certificate (first time) ──────────
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Obtaining SSL certificate for $DOMAIN..."

  # Start nginx temporarily for ACME challenge
  # Use a minimal nginx config that only serves HTTP
  cat > nginx/conf.d/hermit-temp.conf <<'NGINX'
server {
    listen 80;
    server_name hermit.ranax.co;
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

# ── 4. Build and start all services ──────────
echo "Building and starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file .env.production build
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d

# ── 5. Wait for database ─────────────────────
echo "Waiting for database to be ready..."
until docker compose -f "$COMPOSE_FILE" exec db pg_isready -U "$POSTGRES_USER" 2>/dev/null; do
  sleep 2
done

# ── 6. Run Prisma migrations ─────────────────
echo "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec api \
  npx prisma migrate deploy --schema=/app/packages/prisma/schema.prisma

# ── 7. Health check ──────────────────────────
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
