# Cloudflare Tunnel Security Assessment & Operational Policy 🛡️

## 1. Executive Summary

RestroDash enables offline-first and counter-hosted restaurant operations. For single-location restaurants running RestroDash locally on a counter PC (e.g., Windows or Mac on `localhost:3000`), tableside QR ordering requires customers' mobile phones to reach the server without costly static IPs, port forwarding, or cloud infrastructure.

RestroDash implements an **Automated Cloudflare Quick Tunnel Service** with built-in security guardrails. This document outlines the threat model, attack vectors, mitigations, automatic expiration policy, and physical restaurant operational procedures.

---

## 2. Threat Model & Attack Surface

When a local billing counter computer opens a public HTTPS tunnel (`*.trycloudflare.com`), the machine becomes reachable from the public internet. The primary threat vectors include:

```
[Public Internet / Web Crawlers]
             │
             ├──► 1. Automated Domain Scanners (Probing random trycloudflare.com subdomains)
             ├──► 2. Denial of Service (Flooding order endpoints with fake tickets)
             ├──► 3. Prolonged Overnight Exposure (Counter PC left online after hours)
             └──► 4. Table Token Enumeration (Attempting to guess table tokens)
             │
      ┌──────▼─────────────────────────────────────────────────┐
      │  RestroDash Automated Tunnel Security Controls         │
      │  ├─ 1. Automatic Session Rotation (Expires in 8h)       │
      │  ├─ 2. Shift Killswitch (Auto-Shutdown at 11:00 PM)    │
      │  ├─ 3. Sliding Window Rate Limiter (60 req/min/IP)     │
      │  ├─ 4. Cryptographic Table Nonces (128-bit tokens)     │
      │  └─ 5. Route Isolation (Admin & DB files sealed)       │
      └─────────────────────────┬──────────────────────────────┘
                                │
                                ▼
               [Localhost SQLite Engine (WAL Mode)]
```

### Risk Assessment Matrix

| Threat Vector | Inherent Risk | Implemented Defense | Residual Risk |
| :--- | :--- | :--- | :--- |
| **Domain Scanning & Indexing** | **High** | Automatic 8-Hour Tunnel Rotation & Fresh URL Generation | **Low** |
| **Overnight Counter PC Exposure** | **High** | Shift Killswitch (Auto-stops tunnel outside operating hours) | **Zero (Closed)** |
| **Kitchen Flooding / Fake Orders** | **Medium** | Sliding-window IP Rate Limiter (60 req/min + 5-min cooldown) | **Low** |
| **Table Tampering / Token Guessing** | **Medium** | 128-bit Cryptographically Random Hex Table Tokens | **Very Low** |
| **Database File / System Access** | **Critical** | Strict API Path Isolation (SQLite files never served statically)| **Zero (Isolated)** |

---

## 3. Security Controls & Implementation Details

### 3.1. Automatic Session Rotation (Ephemeral Tunnels)
- **Mechanism:** By default, every quick tunnel session is given a maximum **8-hour lifetime** (`rotationIntervalHours: 8`), matching a standard restaurant service shift (lunch or dinner).
- **Behavior:** When the timer expires, the background Tunnel Manager gracefully spins down the old tunnel and initializes a fresh connection with a new unique sub-URL.
- **Security Benefit:** Any scanner, bot, or web crawler that indexed the previous `*.trycloudflare.com` URL within the last shift finds the URL completely dead and non-responsive.

### 3.2. Night Mode & Shift Killswitch
- **Policy:** Restaurants do not take tableside QR orders when closed. Leaving a tunnel running at 3:00 AM creates unnecessary attack surface on the owner's computer.
- **Implementation:** The Tunnel Manager checks operating hours every 5 minutes. Between **11:00 PM and 7:00 AM** (configurable), the tunnel is forcibly terminated.
- **Manual Override:** The restaurant owner can manually toggle the tunnel via the POS settings or Onboarding Launch Hub.

### 3.3. Sliding-Window Rate Limiting
- **Policy:** Protects the local POS and kitchen ticket queue from denial-of-service and bot spam.
- **Threshold:** Max **60 requests per minute per IP address**.
- **Penalty:** If an IP exceeds the threshold, an automated **5-minute cooldown block** is applied with HTTP `429 Too Many Requests`.

### 3.4. Cryptographically Isolated Table Nonces
- Instead of predictable table IDs (e.g. `/m?table=1`), each table is provisioned with a high-entropy 128-bit token:
  ```text
  /m?token=tbl_tok_8f93e2b10a4c5d6e7f8a9b0c1d2e3f4a
  ```
- An outside attacker who discovers the tunnel domain cannot view table menus or submit orders without the exact cryptographic token physically present on that table.

---

## 4. The Physical QR Code Operational Reality

> ⚠️ **The Restaurant Paradox:** If a tunnel rotates and generates a new domain every 8 hours, what happens to **physical stickers printed on tables**?

RestroDash provides three supported operational approaches based on restaurant hardware:

### Approach A: Digital Displays & Dynamic QR Receipts (For Ephemeral Rotating Tunnels)
- **Use Case:** Restaurants using Android/iPad table displays, digital tabletop kiosks, or restaurants that print fresh table chits during seating.
- **How it works:** The display automatically fetches the active tunnel URL via `/api/tunnel` and renders the current QR code. When the tunnel auto-rotates, the on-screen QR refreshes instantly.

### Approach B: Permanent Custom Domain via Cloudflare Named Tunnel (Recommended for Permanent Stickers)
- **Use Case:** Restaurants with high-end laminated acrylic table stands, brass table plates, or printed vinyl stickers that cannot be reprinted daily.
- **How it works:** 
  1. The restaurant adds their domain (e.g., `order.mybistro.com`) to a free Cloudflare account.
  2. Cloudflare provides a permanent free **Tunnel Token**.
  3. The restaurant inputs this token once into RestroDash settings.
  4. The tunnel connects permanently to `order.mybistro.com`. The domain never changes, stickers never expire, and Cloudflare's enterprise Web Application Firewall (WAF) and DDoS filtering protect the counter computer.

### Approach C: Offline LAN Intranet (Zero Internet Exposure)
- **Use Case:** Restaurants in basements, remote areas, or security-sensitive environments.
- **How it works:** Mobile devices connect to the restaurant's internal Wi-Fi (`http://192.168.1.50:3000`). No tunnel is created and no traffic ever leaves the physical premises.

---

## 5. Security Recommendations for Restaurant Operators

1. **Keep Operating System & Antivirus Updated:** Ensure the counter PC runs standard Windows Defender or macOS security updates.
2. **Dedicated Guest Wi-Fi:** If customers connect to restaurant Wi-Fi to scan QR codes, isolate customer devices on a **Guest Wi-Fi network** separate from the POS counter PC network.
3. **Verify Shift Hours:** Set the Shift Killswitch in RestroDash settings to accurately reflect your restaurant's closing time.
4. **Use Cashier Approvals for Orders:** Enable the POS "Waiter/Cashier Confirm Order" toggle so orders placed via QR dining require staff confirmation before firing to physical kitchen printers.
