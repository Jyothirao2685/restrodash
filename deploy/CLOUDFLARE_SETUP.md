# Cloudflare Wildcard DNS & Origin SSL Setup Guide

This guide configures **Cloudflare** for `restrodash.in` and all dynamic restaurant subdomains (`*.restrodash.in`) pointing to your AWS Lightsail VPS.

---

## 1. Attach a Static IP to your AWS Lightsail Instance
1. In your **AWS Lightsail Console** → Go to the **Networking** tab.
2. Click **Create static IP** → Attach it to your Ubuntu 24.04 instance.
3. Note down your static IP (e.g., `13.235.xxx.xxx`).

---

## 2. Cloudflare DNS Configuration

Go to your **Cloudflare Dashboard** → Select your domain `restrodash.in` → **DNS** → **Records**:

| Type | Name | IPv4 Address | Proxy status | TTL |
|---|---|---|---|---|
| **A** | `@` (or `restrodash.in`) | `YOUR_LIGHTSAIL_STATIC_IP` | **Proxied (🟧 Orange Cloud)** | Auto |
| **A** | `*` (Wildcard) | `YOUR_LIGHTSAIL_STATIC_IP` | **Proxied (🟧 Orange Cloud)** | Auto |

> [!NOTE]
> The wildcard record `*` ensures that whenever an onboarding customer chooses a subdomain (e.g., `olivebistro.restrodash.in`), it instantly routes to your Lightsail VPS with zero manual DNS edits.

---

## 3. Generate Free 15-Year Cloudflare Origin CA Certificate

1. In Cloudflare, go to **SSL/TLS** → **Origin Server**.
2. Click **Create Certificate**.
3. Under **Hostnames**, verify it contains:
   - `restrodash.in`
   - `*.restrodash.in`
4. Certificate Validity: **15 years** → Click **Create**.
5. You will see two boxes:
   - **Origin Certificate** (copy entire contents into `/opt/restrodash/ssl/cert.pem` on the VPS)
   - **Private Key** (copy entire contents into `/opt/restrodash/ssl/key.pem` on the VPS)

---

## 4. Set SSL/TLS Encryption Mode

1. In Cloudflare, go to **SSL/TLS** → **Overview**.
2. Select **Full (Strict)**.
   - *Why?* Because Cloudflare communicates with your Nginx server over encrypted HTTPS using the Origin CA certificate you installed.

---

## 5. Enable WebSockets

1. In Cloudflare, go to **Network**.
2. Ensure **WebSockets** is toggled **ON** (enabled by default).
   - This powers the live Kitchen KDS bump updates and synchronized group QR table carts.
