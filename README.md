# RestroDash SaaS Portal & Multi-Tenant Provisioning Engine

Enterprise restaurant POS, collaborative Host-Peer QR table dining, multi-station KDS, and instant automated tenant provisioning for `restrodash.in`.

## Features
- **Editorial SaaS Landing Page:** Built with Haas/Inter Display typography per Airtable design system.
- **Full-Page Onboarding Wizard (`/onboarding`):** Captures restaurant identity, real-time subdomain check, owner credentials, floor table matrix, and plan activation.
- **Direct Database Pre-Seeding:** Spawns isolated `restro.db` (SQLite WAL mode) for every restaurant instance with cryptographically unique QR tokens.
- **AWS Lightsail & Cloudflare Nginx Reverse Proxy:** Dynamic wildcard routing for `*.restrodash.in`.
