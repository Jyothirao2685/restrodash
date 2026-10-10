# RestroDash AWS Lightsail Deployment Playbook

This playbook walks you through configuring your new **AWS Lightsail Ubuntu 24.04 LTS (4 GB RAM, 2 vCPU, 80 GB SSD)** instance for **`restrodash.in`**.

---

## Step 1: Connect to your Lightsail VPS via SSH

In the AWS Lightsail console, click the **Connect using SSH** button on your instance card, or use your terminal:
```bash
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_STATIC_IP
```

---

## Step 2: Install Cloudflare Origin CA SSL Certificates

Create your SSL certificate files on the VPS:

```bash
# 1. Paste your Cloudflare Origin Certificate into cert.pem
nano /opt/restrodash/ssl/cert.pem

# 2. Paste your Cloudflare Private Key into key.pem
nano /opt/restrodash/ssl/key.pem

# Secure certificate permissions
chmod 600 /opt/restrodash/ssl/key.pem
chmod 644 /opt/restrodash/ssl/cert.pem
```

---

## Step 3: Configure Nginx Wildcard Reverse Proxy for restrodash.in

Copy the production Nginx config:

```bash
sudo cat << 'EOF' > /etc/nginx/sites-available/restrodash.conf
# Restore Real Visitor IPs from Cloudflare Proxies
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;
real_ip_header CF-Connecting-IP;

map $subdomain $tenant_port {
    hostnames;
    default 3000;
}

server {
    listen 80;
    listen [::]:80;
    server_name restrodash.in *.restrodash.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name restrodash.in www.restrodash.in;

    ssl_certificate /opt/restrodash/ssl/cert.pem;
    ssl_certificate_key /opt/restrodash/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ~^(?<subdomain>[a-zA-Z0-9-]+)\.restrodash\.in$;

    ssl_certificate /opt/restrodash/ssl/cert.pem;
    ssl_certificate_key /opt/restrodash/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:$tenant_port;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
EOF

# Enable site and reload Nginx
sudo ln -sf /etc/nginx/sites-available/restrodash.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 4: Deploy & Start the Application with PM2

```bash
# In /opt/restrodash/saas:
npm install
npm run build
pm2 start npm --name "restrodash-portal" -- start -- -p 3000
pm2 save
```

---

## Step 5: Test Live!
- Open `https://restrodash.in` in your browser.
- Perform onboarding at `https://restrodash.in/onboarding`.
- Verify your new restaurant instance `https://[subdomain].restrodash.in`.
