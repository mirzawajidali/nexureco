#!/bin/bash
# ============================================
# My Brand — SSL Setup Script
# Run this when your domain is pointed to the VPS
# Usage: bash setup-ssl.sh yourdomain.com your@email.com
# ============================================

set -e

DOMAIN=$1
EMAIL=$2

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: bash setup-ssl.sh <domain> <email>"
    echo "Example: bash setup-ssl.sh mybrand.com admin@mybrand.com"
    exit 1
fi

echo "========================================="
echo "  SSL Setup for: $DOMAIN"
echo "========================================="

cd /opt/mybrand

# ── 1. Verify domain points to this server ──
echo "[1/5] Verifying DNS..."
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    echo "WARNING: Domain $DOMAIN resolves to $DOMAIN_IP"
    echo "         This server's IP is $SERVER_IP"
    echo "         Make sure your DNS A record points to $SERVER_IP"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ── 2. Obtain SSL certificate ──
echo "[2/5] Obtaining SSL certificate..."
docker compose -f docker-compose.prod.yml run --rm \
    --profile ssl \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# ── 3. Update .env.production ──
echo "[3/5] Updating .env.production..."
if grep -q "^DOMAIN=" .env.production; then
    sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env.production
else
    echo "DOMAIN=$DOMAIN" >> .env.production
fi

# Update ALLOWED_ORIGINS to use HTTPS
sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN|" .env.production

echo "Updated DOMAIN=$DOMAIN in .env.production"

# ── 4. Restart frontend to pick up SSL ──
echo "[4/5] Restarting frontend with SSL..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend

# ── 5. Setup auto-renewal cron ──
echo "[5/5] Setting up auto-renewal..."
CRON_CMD="0 3 * * * cd /opt/mybrand && docker compose -f docker-compose.prod.yml run --rm --profile ssl certbot renew --quiet && docker compose -f docker-compose.prod.yml --env-file .env.production restart frontend"

# Add cron job if not already present
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -

echo ""
echo "========================================="
echo "  SSL Setup Complete!"
echo "========================================="
echo ""
echo "Your site is now available at:"
echo "  https://$DOMAIN"
echo ""
echo "Certificate auto-renewal is configured (daily at 3 AM)"
echo ""
