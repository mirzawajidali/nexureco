#!/bin/bash
# ============================================
# My Brand — Initial VPS Setup Script
# Run this ONCE on your Contabo VPS
# Usage: bash setup-server.sh
# ============================================

set -e

echo "========================================="
echo "  My Brand — VPS Setup"
echo "========================================="

# ── 1. Update system ──
echo "[1/6] Updating system packages..."
apt-get update && apt-get upgrade -y

# ── 2. Install Docker ──
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

# ── 3. Install Docker Compose (if not bundled) ──
echo "[3/6] Verifying Docker Compose..."
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi
docker compose version

# ── 4. Setup firewall ──
echo "[4/6] Configuring firewall..."
apt-get install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Firewall configured (SSH, HTTP, HTTPS)"

# ── 5. Create project directory ──
echo "[5/6] Setting up project directory..."
mkdir -p /opt/mybrand
cd /opt/mybrand

if [ ! -f .env.production ]; then
    echo ""
    echo "==========================================="
    echo "  IMPORTANT: Copy your .env.production file"
    echo "  to /opt/mybrand/.env.production"
    echo "==========================================="
    echo ""
fi

# ── 6. Create systemd service ──
echo "[6/6] Creating systemd service..."
cat > /etc/systemd/system/mybrand.service << 'EOF'
[Unit]
Description=My Brand Ecommerce
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/mybrand
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml --env-file .env.production up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mybrand.service
echo "Systemd service created and enabled"

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Copy .env.production to /opt/mybrand/.env.production"
echo "  2. Copy docker-compose.prod.yml to /opt/mybrand/"
echo "  3. Login to GHCR:"
echo "     docker login ghcr.io -u YOUR_GITHUB_USERNAME"
echo "  4. Pull images & start:"
echo "     cd /opt/mybrand"
echo "     export GHCR_OWNER=YOUR_GITHUB_USERNAME"
echo "     docker compose -f docker-compose.prod.yml --env-file .env.production pull"
echo "     docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
echo "  5. Add GitHub Secrets for CI/CD:"
echo "     - VPS_HOST: Your VPS IP address"
echo "     - VPS_USER: root (or your SSH user)"
echo "     - VPS_SSH_KEY: Your private SSH key"
echo "     - VITE_API_URL: http://YOUR_VPS_IP (or https://yourdomain.com)"
echo ""
