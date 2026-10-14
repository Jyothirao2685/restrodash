# RestroDash 🍽️

> **Open-Source Restaurant POS, Live QR Tableside Dining & Kitchen Display Engine.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](Dockerfile)

RestroDash is an open-source, plug-and-play restaurant management platform designed for tableside QR dining, kitchen order ticketing (KOT), real-time kitchen display screens (KDS), and billing counter POS operations.

---

## ✨ Features

- **📱 Tableside QR Ordering:** Customers scan a table QR code on their smartphone to browse the digital menu and submit orders directly—no app download required.
- **🖥️ Kitchen Display System (KDS):** Real-time order dispatch screen showing incoming orders with preparation timers, course stages, and one-tap status updates.
- **⚡ Counter POS & Waiter Mode:** Fast order taking, table reassignment, split bills, and instant receipt generation.
- **🛡️ Isolated SQLite Engine (WAL Mode):** Data is isolated in zero-maintenance SQLite databases running in Write-Ahead Log mode with zero cloud database dependency.
- **🚀 100% Free & Open-Source:** No subscription fees, no locked payment gates, no credit card required. Free for personal and commercial use under the **MIT License**.

---

## 📱 How Table QR Ordering Works (Localhost vs VPS)

A common question is: ***"If I run RestroDash on my restaurant's billing computer at `localhost:3000`, how can customers scan QR codes from their mobile phones?"***

Because `localhost` on a customer's phone refers to the phone itself, the QR code must point to a reachable address. RestroDash supports three easy methods:

| Method | Best For | Requirement | Cost |
| :--- | :--- | :--- | :--- |
| **1. Automatic Cloudflare Tunnel** | Local counter PC (Zero config) | **Built-in (Starts automatically in UI)** | **100% Free** |
| **2. Cloud VPS + Custom Domain** | Production restaurant | Any $4 VPS + `order.yourrestaurant.com` | ~$4/month |
| **3. Local Wi-Fi (LAN IP)** | Offline-only restaurant | Same Wi-Fi router (`http://192.168.1.x:3000`) | **100% Free** |

- 🛡️ **Security Assessment & Rotation Policy:** [Cloudflare Tunnel Security Assessment](docs/TUNNEL_SECURITY_ASSESSMENT.md)
- 📖 **Domain & QR Setup Guide:** [Restaurant Domain & QR Setup Guide](docs/DOMAIN_AND_QR_SETUP.md)

---

## 🚀 Quickstart & Deployment

RestroDash is designed to deploy cleanly on **Docker**, any cloud VPS (AWS, DigitalOcean, Hetzner), or directly on your local computer.

### Option 1: One-Click Docker Deployment (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/Jyothirao2685/restrodash.git
   cd restrodash
   ```

2. Start the container:
   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:3000` in your browser.  
   Persistent instance databases are stored safely in the Docker volume `restrodash_instances`.

---

### Option 2: Direct VPS Deployment (Node.js 22 + PM2)

1. **Install Node.js 22 & PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone & Install Dependencies:**
   ```bash
   git clone https://github.com/Jyothirao2685/restrodash.git /opt/restrodash
   cd /opt/restrodash
   npm ci
   ```

3. **Build & Start with PM2:**
   ```bash
   npm run build
   PORT=3000 pm2 start "npm start" --name "restrodash"
   pm2 save
   ```

---

### Option 3: Local Development (Windows / Mac / Linux)

```bash
# 1. Install dependencies
npm install

# 2. Start local Turbopack dev server
npm run dev

# 3. Visit http://localhost:3000/onboarding to setup your restaurant & tables
```

---

## 🗄️ Architecture & System Design

RestroDash isolates restaurant data at the database boundary. Every restaurant provisioned receives an isolated SQLite database (`restro.db`) running in **Write-Ahead Log (WAL) mode**.

```
                           ┌──────────────────────────┐
                           │   Incoming HTTP Request  │
                           │  (Domain / Cloudflare)   │
                           └─────────────┬────────────┘
                                         │
                                         ▼
                           ┌──────────────────────────┐
                           │     RestroDash Engine    │
                           │      (Next.js Standalone)│
                           └─────────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
    ┌─────────────────────────┐                     ┌─────────────────────────┐
    │  Table QR Ordering (/m) │                     │   Counter POS / KDS     │
    │  - Cryptographic Tokens │                     │  - Fast Order Taking    │
    │  - Mobile Web Menu      │                     │  - Kitchen Display      │
    │  - Real-Time Cart       │                     │  - Bill Settlement      │
    └─────────────────────────┘                     └─────────────────────────┘
```

---

## 🔒 Security & Data Privacy

- **Zero Remote Dependencies:** Operates locally with SQLite; no external third-party database connections or analytics tracking.
- **Zero Gatekeeping:** No mandatory payment gateways or licensing servers.
- **Cryptographic QR Tokens:** Table QR codes use secure random tokens preventing unauthorized order tampering across tables.

---

## 📜 License

RestroDash is open-source software licensed under the **[MIT License](LICENSE)**. You are free to use, modify, distribute, and self-host for personal or commercial restaurant operations without restriction.
