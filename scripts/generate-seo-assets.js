const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateAssets() {
  const publicDir = path.join(__dirname, '..', 'public');
  const logoPath = path.join(publicDir, 'restro-logo.png');

  if (!fs.existsSync(logoPath)) {
    throw new Error('Base logo not found at ' + logoPath);
  }

  // 1. Generate 180x180 apple-touch-icon.png
  const logoResized = await sharp(logoPath)
    .resize(130, null, { fit: 'inside' })
    .toBuffer();

  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 24, g: 29, b: 38, alpha: 1 },
    },
  })
    .composite([{ input: logoResized, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png');

  // 2. Generate 32x32 and 16x16 favicons
  const favicon32Buf = await sharp(path.join(publicDir, 'apple-touch-icon.png'))
    .resize(32, 32)
    .png()
    .toBuffer();

  await sharp(path.join(publicDir, 'apple-touch-icon.png'))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  await sharp(path.join(publicDir, 'apple-touch-icon.png'))
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));

  // ICO header wrapping 32x32 PNG
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // reserved
  icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // count = 1

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(32, 0); // width
  dirEntry.writeUInt8(32, 1); // height
  dirEntry.writeUInt8(0, 2);  // color count
  dirEntry.writeUInt8(0, 3);  // reserved
  dirEntry.writeUInt16LE(1, 4); // planes
  dirEntry.writeUInt16LE(32, 6); // bpp
  dirEntry.writeUInt32LE(favicon32Buf.length, 8); // size
  dirEntry.writeUInt32LE(6 + 16, 12); // offset

  fs.writeFileSync(
    path.join(publicDir, 'favicon.ico'),
    Buffer.concat([icoHeader, dirEntry, favicon32Buf])
  );
  console.log('Generated public/favicon.ico');

  // 3. Generate 1200x630 og-image.png
  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#181d26" />
        <stop offset="100%" stop-color="#0e1218" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bgGrad)" />
    <rect x="40" y="40" width="1120" height="550" rx="16" fill="none" stroke="#2e3646" stroke-width="2" />
    <rect x="40" y="40" width="1120" height="4" fill="#fcab79" />

    <!-- Brand Category Pill -->
    <rect x="90" y="90" width="290" height="38" rx="8" fill="#222936" stroke="#2e3646" stroke-width="1" />
    <text x="105" y="115" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#fcab79" letter-spacing="1">OFFLINE-FIRST RESTAURANT OS</text>

    <!-- Main Title -->
    <text x="90" y="200" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff" letter-spacing="-1">RestroDash</text>
    <text x="90" y="255" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="400" fill="#e0e2e6">The Operating System for High-Volume Dining</text>

    <!-- Description -->
    <text x="90" y="325" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="400" fill="#9ca3af">Run tableside mobile billing, host-peer collaborative QR dining, multi-station KDS,</text>
    <text x="90" y="355" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="400" fill="#9ca3af">and ESC/POS thermal printing with zero cloud latency and guaranteed LAN continuity.</text>

    <!-- Feature Pillars -->
    <g transform="translate(90, 420)">
      <rect x="0" y="0" width="235" height="85" rx="8" fill="#1e2430" stroke="#2e3646" stroke-width="1" />
      <text x="18" y="36" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#ffffff">Local SQLite WAL</text>
      <text x="18" y="62" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" fill="#9ca3af">Sub-ms local transactions</text>

      <rect x="255" y="0" width="235" height="85" rx="8" fill="#1e2430" stroke="#2e3646" stroke-width="1" />
      <text x="273" y="36" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#ffffff">Host-Peer QR</text>
      <text x="273" y="62" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" fill="#9ca3af">4-digit PIN table sync</text>

      <rect x="510" y="0" width="235" height="85" rx="8" fill="#1e2430" stroke="#2e3646" stroke-width="1" />
      <text x="528" y="36" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#ffffff">Kitchen KDS (:3002)</text>
      <text x="528" y="62" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" fill="#9ca3af">Multi-station routing</text>

      <rect x="765" y="0" width="255" height="85" rx="8" fill="#1e2430" stroke="#2e3646" stroke-width="1" />
      <text x="783" y="36" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="600" fill="#ffffff">ESC/POS Thermal</text>
      <text x="783" y="62" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" fill="#9ca3af">Golden column oracle alignment</text>
    </g>

    <!-- Footer URL -->
    <text x="90" y="555" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="600" fill="#ffffff">restrodash.in</text>
    <text x="200" y="555" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="14" fill="#6b7280">• Dedicated Isolated VPS Cloud Engine</text>
  </svg>
  `;

  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('Generated public/og-image.png');

  // 4. Generate manifest.webmanifest
  const manifest = {
    name: 'RestroDash Restaurant POS',
    short_name: 'RestroDash',
    description: 'The Offline-First POS & Operating System for Restaurants',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#181d26',
    icons: [
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/restro-logo.png',
        sizes: '1722x604',
        type: 'image/png',
      },
    ],
  };

  fs.writeFileSync(
    path.join(publicDir, 'manifest.webmanifest'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Generated public/manifest.webmanifest');
}

generateAssets().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
