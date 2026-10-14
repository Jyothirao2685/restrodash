# RestroDash 🍽️

> **Enterprise Restaurant POS, Dynamic Subdomain Multi-Tenancy & Tableside Dining Engine.**

[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](Dockerfile)

RestroDash is a full-stack restaurant software platform designed for fast-paced dining operations, table seating matrices, kitchen order ticketing (KOT), real-time kitchen display screens (KDS), and automated tenant database provisioning.

---

## 🏛️ Architecture & System Design

RestroDash isolates restaurant data at the database boundary rather than relying solely on row-level tenancy filters. Every restaurant provisioned receives an isolated SQLite database (`restro.db`) running in **Write-Ahead Log (WAL) mode**.

```
                           ┌──────────────────────────┐
                           │   Incoming HTTP Request  │
                           │ (*.restrodash.in / host) │
                           └─────────────┬────────────┘
                                         │
                                         ▼
                           ┌──────────────────────────┐
                           │   Reverse Proxy Router   │
                           │ (Subdomain Resolution)   │
                           └─────────────┬────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼                                               ▼
    ┌─────────────────────────┐                     ┌─────────────────────────┐
    │  Restaurant A Workspace │                     │  Restaurant B Workspace │
    │   (/instances/bistro)   │                     │   (/instances/cafe)     │
    │  - restro.db (SQLite)   │                     │  - restro.db (SQLite)   │
    │  - Isolated QR Tokens   │                     │  - Isolated QR Tokens   │
    │  - Dedicated Port Set   │                     │  - Dedicated Port Set   │
    └─────────────────────────┘                     └─────────────────────────┘
```

### Key Engineering Features
- **Blast Radius Containment:** If one restaurant executes high-load analytics or encounters corruption, neighboring tenants remain completely unaffected.
- **Zero-Downtime Standalone Output:** Built with Next.js `output: 'standalone'` for minimal container footprint (<150MB) and fast cold boots.
- **Dynamic Table Seeding:** Automatically provisions table matrices with cryptographically unique tokens for host-peer tableside QR ordering.
- **Offline & Hardware-Ready:** Built to interface with ESC/POS receipt printers and local kitchen display screens.

---

## 🚀 Quickstart & Deployment

RestroDash is designed to deploy cleanly on **Docker**, any cloud VPS (AWS, DigitalOcean, Hetzner), or directly on bare metal.

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
   Persistent instance databases will be stored safely in the Docker volume `restrodash_instances`.

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

### Option 3: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local Turbopack dev server
npm run dev

# 3. Visit http://localhost:3000
```

---

## 🔒 Security & Privacy Notice

This repository contains **zero hardcoded credentials, production secrets, or customer data**:
- Payment gateway integration uses environment fallback simulation (`rzp_test_placeholder`) if no live keys are configured.
- Database provisioning generates unique salt-hashed passwords with bcrypt and isolated runtime tokens on demand.
- Sensitive environment files (`.env*`) and runtime instance folders (`/instances/`) are strictly ignored via `.gitignore`.

---

## 📜 Legal License (Non-Commercial Source-Available)

RestroDash is released publicly under the **[PolyForm Noncommercial License 1.0.0](LICENSE)**.

### What You Can Do:
- ✅ View, clone, read, and audit the complete source code.
- ✅ Run, test, and self-host for personal, educational, research, and non-commercial development.
- ✅ Submit issues, contributions, and bug fixes.

### What You Cannot Do:
- ❌ **No Commercial Use:** You cannot use this software, in whole or in part, for any commercial advantage, monetary compensation, or revenue-generating activities.
- ❌ **No Reselling or Managed SaaS:** You cannot package, sell, or host this software as a paid service to third parties.

For commercial licensing inquiries, please contact the repository owner.
