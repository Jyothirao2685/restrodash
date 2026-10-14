# RestroDash

RestroDash is an open-source restaurant POS, tableside QR ordering engine, and kitchen display system (KDS). It is designed to run offline on local counter hardware, on cloud virtual private servers, or in containerized Docker environments.

## Installation

Clone the repository and install dependencies using Node.js 22:

```bash
git clone https://github.com/Jyothirao2685/restrodash.git
cd restrodash
npm install
```

Alternatively, run RestroDash with Docker Compose:

```bash
docker compose up -d --build
```

## Usage

### Local Development

Start the development server:

```bash
npm run dev
```

The application runs on `http://localhost:3000`.

### Core Interfaces

- Restaurant Setup and Onboarding: `http://localhost:3000/onboarding`
- Counter POS Terminal: `http://localhost:3000/pos`
- Kitchen Display System (KDS): `http://localhost:3002/kds`
- Mobile Tableside Ordering: `http://localhost:3000/m?token=<TABLE_TOKEN>`

### Tableside QR Ordering on Local Hardware

When hosting RestroDash on a local counter computer (`localhost`), customer mobile devices cannot reach `localhost` directly. RestroDash supports three network configurations:

1. Automatic Cloudflare Tunnel: Starts directly from the onboarding interface, providing an encrypted public HTTPS URL without router port forwarding. Includes automated 8-hour session rotation and night-time shutdown.
2. Cloud VPS and Custom Domain: Host RestroDash on a cloud server and map a custom domain (such as `order.yourrestaurant.com`).
3. Local Wi-Fi (LAN): Connect customer and staff devices to the same local network using the counter machine's LAN IP address (`http://192.168.x.x:3000`).

Detailed documentation:
- [Domain and QR Setup Guide](docs/DOMAIN_AND_QR_SETUP.md)
- [Tunnel Security Assessment and Rotation Policy](docs/TUNNEL_SECURITY_ASSESSMENT.md)

## Architecture

- Frontend and Application Layer: Next.js with React and Tailwind CSS.
- Database: Isolated SQLite database (`restro.db`) per restaurant instance, running in Write-Ahead Log (WAL) mode.
- Networking: Integrated tunnel manager for remote tableside ordering and local network fallback.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to run lint and build checks before submitting:

```bash
npm run lint
npm run build
```

## License

[MIT](LICENSE)
