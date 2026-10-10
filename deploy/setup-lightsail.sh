#!/usr/bin/env bash
# ==============================================================================
# RestroDash AWS Lightsail VPS Initialization Script (Ubuntu 24.04 LTS)
# ==============================================================================
set -e

echo "=================================================================="
echo "🚀 Starting RestroDash Server Initialization on Ubuntu 24.04 LTS"
echo "=================================================================="

# 1. Update system packages
echo "\n[1/7] Updating package index..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install essential build tools, Nginx, SQLite3, and UFW
echo "\n[2/7] Installing system dependencies (Nginx, SQLite3, Git, Curl)..."
sudo apt-get install -y curl git ufw nginx sqlite3 build-essential python3

# 3. Install Node.js 22 LTS (via NodeSource)
echo "\n[3/7] Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Install PM2 and PNPM globally
echo "\n[4/7] Installing PM2 and PNPM..."
sudo npm install -g pm2 pnpm
pm2 --version

# 5. Create RestroDash standard directory structure
echo "\n[5/7] Creating /opt/restrodash directory hierarchy..."
sudo mkdir -p /opt/restrodash/saas
sudo mkdir -p /opt/restrodash/pos-engine
sudo mkdir -p /opt/restrodash/instances
sudo mkdir -p /opt/restrodash/logs
sudo mkdir -p /opt/restrodash/ssl
sudo chown -R $USER:$USER /opt/restrodash

# 6. Configure UFW Firewall (SSH, HTTP, HTTPS)
echo "\n[6/7] Configuring UFW Firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
sudo ufw status

# 7. Configure PM2 to start on system boot
echo "\n[7/7] Configuring PM2 systemd startup hook..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

echo "\n=================================================================="
echo "✅ Server dependencies and directory structure successfully installed!"
echo "Next step: Configure Cloudflare Origin SSL & deploy Nginx config."
echo "=================================================================="
