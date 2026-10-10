const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generate() {
  const root = path.join(__dirname, '..');
  const sourcePath = path.join(root, 'assets', 'favicon_io', 'restro-logo.png');

  if (!fs.existsSync(sourcePath)) {
    throw new Error('Source logo not found: ' + sourcePath);
  }

  // Extract perfectly balanced crop:
  // content: minX: 199, maxX: 1800, minY: 779, maxY: 1303 (center: 1000, 1041)
  // 60px padding on left/right, 40px padding on top/bottom
  const cropBox = { left: 139, top: 739, width: 1722, height: 604 };

  const croppedBlack = sharp(sourcePath).extract(cropBox);
  const blackBuffer = await croppedBlack.png().toBuffer();

  // Generate pure white (#FFFFFF) version with identical alpha mask
  const { data, info } = await sharp(blackBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;     // R
    data[i + 1] = 255; // G
    data[i + 2] = 255; // B
    // Alpha channel data[i + 3] preserved as is
  }
  const whiteBuffer = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();

  const targets = [
    // Public directory
    { dest: path.join(root, 'frontend', 'public', 'restro-logo.png'), buf: blackBuffer },
    { dest: path.join(root, 'frontend', 'public', 'restro-logo-white.png'), buf: whiteBuffer },
    { dest: path.join(root, 'frontend', 'public', 'logo.png'), buf: blackBuffer },
    { dest: path.join(root, 'frontend', 'public', 'logo-white.png'), buf: whiteBuffer },
    // Out directory (used by dev-server & static export)
    { dest: path.join(root, 'frontend', 'out', 'restro-logo.png'), buf: blackBuffer },
    { dest: path.join(root, 'frontend', 'out', 'restro-logo-white.png'), buf: whiteBuffer },
    { dest: path.join(root, 'frontend', 'out', 'logo.png'), buf: blackBuffer },
    { dest: path.join(root, 'frontend', 'out', 'logo-white.png'), buf: whiteBuffer },
  ];

  for (const t of targets) {
    const dir = path.dirname(t.dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(t.dest, t.buf);
    console.log(`Generated: ${path.relative(root, t.dest)} (${t.buf.length} bytes)`);
  }

  console.log('✅ Logo assets generated successfully!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
