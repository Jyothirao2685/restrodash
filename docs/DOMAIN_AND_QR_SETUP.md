# Restaurant Domain and QR Code Setup Guide

When running RestroDash for your restaurant, tableside QR ordering requires customers' mobile phones to reach your RestroDash server. 

This guide explains **how QR ordering works across different deployment environments** and provides step-by-step instructions for:
1. **Localhost Counter PC (Zero-Cost with Free Cloudflare Tunnel)** — *Easiest for single-location restaurants running on a Windows/Mac counter PC without cloud hosting fees.*
2. **Cloud VPS with Custom Domain (`order.myrestaurant.com`)** — *Recommended for production, high reliability, and multi-staff access.*
3. **Local Wi-Fi Network (LAN IP without Internet)** — *Best for completely offline setups or closed local networks.*

---

## Accessing Localhost Servers from Mobile Devices

If your restaurant computer is running RestroDash at `http://localhost:3000`:
- On your computer, `localhost` means *this computer*.
- On a customer's smartphone connected to 5G or Wi-Fi, `localhost` means *the smartphone itself*.
- Therefore, a QR code pointing to `http://localhost:3000/m?token=...` will fail on any external device.

To make QR codes work from customers' phones, your RestroDash instance must be reachable via either:
- A **Public HTTPS Domain** (via Cloudflare Tunnel or VPS)
- A **Local Network IP** (e.g., `http://192.168.1.50:3000`)

---

## Method 1: Permanent Cloudflare Named Tunnel (Recommended for Real Restaurants)

For physical restaurant tables, QR codes must be permanent. Cloudflare Named Tunnels allow you to map your own custom domain (e.g. `order.myrestaurant.com`) directly to your counter computer (`http://localhost:3000`) for free, without router port forwarding or static IPs.

### Why this is the gold standard for physical QR codes:
- **Permanent QR Codes:** The URL is permanently `https://order.myrestaurant.com/m?token=...`. Printed acrylic stands and table stickers never expire and never need reprinting.
- **100% Free Forever:** Cloudflare Zero Trust tunnels are completely free.
- **Enterprise Security:** Cloudflare WAF and DDoS protection shield your local billing computer from outside attacks.
- **Zero Network Setup:** Works automatically behind standard commercial routers, Wi-Fi, or mobile hotspots.

### 4-Step Setup Guide:

1. **Create a Free Cloudflare Account:**
   - Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/) and add your restaurant's domain.
2. **Create a Named Tunnel:**
   - In the Cloudflare dashboard, go to **Zero Trust** → **Networks** → **Tunnels**.
   - Click **Create a Tunnel**, select **Cloudflared**, and give it a name (e.g., `my-counter-pos`).
   - In the installation step, copy the tunnel **Token** (the alphanumeric string starting with `eyJh...`).
3. **Configure Public Hostname:**
   - In the tunnel settings, click **Public Hostnames** → **Add a public hostname**.
   - Subdomain: `order` (or leave empty for root domain).
   - Domain: `yourrestaurant.com`.
   - Service: Type `HTTP`, URL: `localhost:3000`.
   - Click **Save Hostname**.
4. **Connect in RestroDash:**
   - In the RestroDash Onboarding Step 4 Launch Hub (or Settings), paste your domain (`order.yourrestaurant.com`) and your Cloudflare Tunnel Token.
   - Click **Connect Permanent Tunnel**.
   - RestroDash connects automatically in the background. Your table QR codes are now permanent!

---

### Alternative: Quick Ephemeral Tunnel (Testing Only)

If you do not have a custom domain yet and want an immediate 30-second test from your phone:
- Click **Start Temporary Quick Tunnel** in the Onboarding Launch Hub.
- RestroDash creates an instant temporary `trycloudflare.com` link.
- Note: Quick tunnel URLs change upon restart and are intended for testing only, not for physical table stickers.


---

## Method 2: Cloud VPS with Custom Domain (Recommended for Production)

For restaurants wanting 24/7 uptime without keeping the counter PC running all night, deploy RestroDash on any inexpensive cloud VPS (DigitalOcean, Hetzner, AWS Lightsail, Linode ~$4–$5/month).

### 1. Point Your Domain DNS to Your VPS
In your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add an `A` record:
- **Type:** `A`
- **Name / Host:** `order` (or `@` for root domain)
- **Value / IPv4 Address:** `YOUR_SERVER_PUBLIC_IP`
- **TTL:** Auto or 300 seconds

### 2. Run RestroDash with Docker Compose
SSH into your VPS and run:
```bash
git clone https://github.com/Jyothirao2685/restrodash.git /opt/restrodash
cd /opt/restrodash
docker compose up -d --build
```

### 3. Setup Nginx Reverse Proxy with Free SSL (Certbot)
Install Nginx and Certbot:
```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/restrodash`:
```nginx
server {
    server_name order.myrestaurant.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain an SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/restrodash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d order.myrestaurant.com
```

### 4. Print Table QR Codes
Your Table QR URLs will be:
`https://order.myrestaurant.com/m?token=TABLE_QR_TOKEN`

---

## Method 3: Local Wi-Fi Network (LAN IP - Offline)

If your restaurant does not have a reliable internet connection or you prefer an offline-only intranet setup:

1. Connect the counter PC and customer phones / waiter tablets to the **same restaurant Wi-Fi router**.
2. Find your counter computer's Local IP address:
   - **Windows:** Run `ipconfig` (look for `IPv4 Address`, e.g., `192.168.1.105`).
   - **macOS / Linux:** Run `ifconfig` or `ip a` (e.g., `192.168.1.105`).
3. Ensure Windows Firewall / Mac Firewall allows inbound traffic on port `3000`.
4. Your Table QR URLs will be:
   `http://192.168.1.105:3000/m?token=TABLE_QR_TOKEN`
5. Customers connected to the restaurant Wi-Fi can scan and order directly without internet access!

---

## How Table Tokens Work

In RestroDash, each table is assigned a secure random token during database setup:
- Table 1: `T1-8a9f4c`
- Table 2: `T2-3d7b1e`
- Table 3: `T3-9c2e5a`

When a diner scans `https://your-domain.com/m?token=T1-8a9f4c`:
1. The mobile dining client verifies the token with the database.
2. Orders submitted from that phone are tagged automatically with **Table 1**.
3. The Kitchen Display System (KDS) and Billing Counter immediately receive the order with the correct table number and timestamps.
4. No app download or customer sign-up is required!
