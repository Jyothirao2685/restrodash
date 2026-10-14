# Restaurant Domain & QR Code Setup Guide 📱🍽️

When running RestroDash for your restaurant, tableside QR ordering requires customers' mobile phones to reach your RestroDash server. 

This guide explains **how QR ordering works across different deployment environments** and provides step-by-step instructions for:
1. **Localhost Counter PC (Zero-Cost with Free Cloudflare Tunnel)** — *Easiest for single-location restaurants running on a Windows/Mac counter PC without cloud hosting fees.*
2. **Cloud VPS with Custom Domain (`order.myrestaurant.com`)** — *Recommended for production, high reliability, and multi-staff access.*
3. **Local Wi-Fi Network (LAN IP without Internet)** — *Best for completely offline setups or closed local networks.*

---

## ⚠️ The "Localhost" Reality: Why Phones Can't Scan `http://localhost:3000`

If your restaurant computer is running RestroDash at `http://localhost:3000`:
- On your computer, `localhost` means *this computer*.
- On a customer's smartphone connected to 5G or Wi-Fi, `localhost` means *the smartphone itself*.
- Therefore, a QR code pointing to `http://localhost:3000/m?token=...` will fail on any external device.

To make QR codes work from customers' phones, your RestroDash instance must be reachable via either:
- A **Public HTTPS Domain** (via Cloudflare Tunnel or VPS)
- A **Local Network IP** (e.g., `http://192.168.1.50:3000`)

---

## Method 1: Localhost Counter PC with Free Cloudflare Tunnel (Recommended for Beginners)

If you don't want to pay for a cloud VPS and want to run RestroDash directly on your billing counter computer, you can expose your local port `3000` to a secure public HTTPS URL using Cloudflare's official free tunnel (`cloudflared`).

### Advantages:
- **100% Free forever** (no subscription, no server costs).
- **No router port-forwarding or public IP required.**
- **Automatic HTTPS/SSL certificates** (camera QR scanners require HTTPS for modern browser permissions).
- Works even behind restrictive ISP routers or mobile hotspots.

### Step-by-Step Setup:

1. **Start RestroDash locally:**
   ```bash
   npm run dev
   # RestroDash is now running on http://localhost:3000
   ```

2. **Download Cloudflare Tunnel (`cloudflared`):**
   - **Windows:** Download `cloudflared-windows-amd64.exe` from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases) or via winget:
     ```powershell
     winget install --id Cloudflare.cloudflared
     ```
   - **macOS (Homebrew):**
     ```bash
     brew install cloudflared
     ```
   - **Linux:**
     ```bash
     sudo apt-get install cloudflared
     ```

3. **Start an Instant Public Tunnel:**
   Run this single command in your terminal:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Copy your Public HTTPS URL:**
   Cloudflare will output a public tunnel link, for example:
   ```text
   +--------------------------------------------------------------------------------------------+
   |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
   |  https://curly-pine-salmon-92a1.trycloudflare.com                                          |
   +--------------------------------------------------------------------------------------------+
   ```

5. **Generate your QR Codes:**
   - In your RestroDash Onboarding or Table Management screen, enter `https://curly-pine-salmon-92a1.trycloudflare.com` as your Base URL.
   - Your table QR codes will instantly format as:
     `https://curly-pine-salmon-92a1.trycloudflare.com/m?token=TABLE_QR_TOKEN`
   - Print your table QR codes and place them on your tables! Any customer scanning the QR code from their mobile phone will instantly see your live digital menu and place orders.

*(Optional)* If you own a custom domain (e.g. `order.myrestaurant.com`), you can bind `cloudflared` to your Cloudflare account permanently for free so the URL never changes across restarts.

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

## 🖨️ How Table Tokens Work

In RestroDash, each table is assigned a secure random token during database setup:
- Table 1: `T1-8a9f4c`
- Table 2: `T2-3d7b1e`
- Table 3: `T3-9c2e5a`

When a diner scans `https://your-domain.com/m?token=T1-8a9f4c`:
1. The mobile dining client verifies the token with the database.
2. Orders submitted from that phone are tagged automatically with **Table 1**.
3. The Kitchen Display System (KDS) and Billing Counter immediately receive the order with the correct table number and timestamps.
4. No app download or customer sign-up is required!
