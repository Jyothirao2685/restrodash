const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Build Windows multi-resolution ICO file from PNG buffers
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const directoryEntries = [];
  let offset = 6 + count * 16;

  for (const { buffer, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data
    directoryEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...pngBuffers.map((p) => p.buffer)]);
}

async function main() {
  const root = path.join(__dirname, '..');
  const srcImage = path.join(root, 'assets/no_bg_icons/android-chrome-512x512.png');

  // 1. Crop to exact bounding box of the glyph: 190, 135, 132, 243
  const glyphBuffer = await sharp(srcImage)
    .extract({ left: 190, top: 135, width: 132, height: 243 })
    .toBuffer();

  const glyphRatio = 132 / 243;

  async function generateSize(size) {
    // Fill ~94% of canvas height (maximized)
    const targetH = size <= 16 ? 15 : size <= 32 ? 30 : Math.round(size * 0.94);
    const targetW = Math.max(1, Math.round(targetH * glyphRatio));

    // Resize glyph
    const resized = await sharp(glyphBuffer)
      .resize(targetW, targetH, { fit: 'fill', kernel: 'lanczos3' })
      .toBuffer();

    // Turn RGB into pure white [255, 255, 255], retain and enhance alpha
    const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      // At tiny sizes (16x16, 32x32), boost mid-alphas for crisp, bold rendering on dark tabs
      if (size <= 16 && data[i + 3] > 30) {
        data[i + 3] = Math.min(255, Math.round(data[i + 3] * 1.3));
      } else if (size <= 32 && data[i + 3] > 40) {
        data[i + 3] = Math.min(255, Math.round(data[i + 3] * 1.15));
      }
    }

    const whiteGlyph = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    }).png().toBuffer();

    const padX = Math.floor((size - targetW) / 2);
    const padY = Math.floor((size - targetH) / 2);

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: whiteGlyph, left: padX, top: padY }])
      .png()
      .toBuffer();
  }

  // Pre-generate buffers for ICO
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoPngBuffers = [];
  for (const s of icoSizes) {
    icoPngBuffers.push({ size: s, buffer: await generateSize(s) });
  }
  const icoBuffer = buildIco(icoPngBuffers);

  // Write ICO files
  fs.writeFileSync(path.join(root, 'frontend/public/favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'frontend/src/app/favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'assets/icon.ico'), icoBuffer);

  // Generate specific PNG sizes
  const sizeMap = {
    'frontend/public/favicon-16x16.png': 16,
    'frontend/public/favicon-32x32.png': 32,
    'frontend/public/apple-touch-icon.png': 180,
    'frontend/public/icon-192.png': 192,
    'frontend/public/icon-512.png': 512,

    'assets/icon-16.png': 16,
    'assets/icon-32.png': 32,
    'assets/icon-44.png': 44,
    'assets/icon-48.png': 48,
    'assets/icon-64.png': 64,
    'assets/icon-71.png': 71,
    'assets/icon-128.png': 128,
    'assets/icon-150.png': 150,
    'assets/icon-256.png': 256,
    'assets/icon-300.png': 300,
    'assets/icon-512.png': 512,
    'assets/icon.png': 512,

    'assets/icon.iconset/icon_16x16.png': 16,
    'assets/icon.iconset/icon_16x16@2x.png': 32,
    'assets/icon.iconset/icon_32x32.png': 32,
    'assets/icon.iconset/icon_32x32@2x.png': 64,
    'assets/icon.iconset/icon_128x128.png': 128,
    'assets/icon.iconset/icon_128x128@2x.png': 256,
    'assets/icon.iconset/icon_256x256.png': 256,
    'assets/icon.iconset/icon_256x256@2x.png': 512,
    'assets/icon.iconset/icon_512x512.png': 512,
    'assets/icon.iconset/icon_512x512@2x.png': 1024,

    'assets/icons/hicolor/16x16/apps/flocafe.png': 16,
    'assets/icons/hicolor/32x32/apps/flocafe.png': 32,
    'assets/icons/hicolor/64x64/apps/flocafe.png': 64,
    'assets/icons/hicolor/128x128/apps/flocafe.png': 128,
    'assets/icons/hicolor/256x256/apps/flocafe.png': 256,
    'assets/icons/hicolor/512x512/apps/flocafe.png': 512,
  };

  for (const [relPath, size] of Object.entries(sizeMap)) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    }
    const buf = await generateSize(size);
    fs.writeFileSync(fullPath, buf);
  }

  // Also sync to frontend/out and dist/frontend if they exist
  const outDirs = [
    path.join(root, 'frontend/out'),
    path.join(root, 'dist/frontend'),
  ];

  for (const outDir of outDirs) {
    if (fs.existsSync(outDir)) {
      fs.writeFileSync(path.join(outDir, 'favicon.ico'), icoBuffer);
      fs.copyFileSync(path.join(root, 'frontend/public/favicon-16x16.png'), path.join(outDir, 'favicon-16x16.png'));
      fs.copyFileSync(path.join(root, 'frontend/public/favicon-32x32.png'), path.join(outDir, 'favicon-32x32.png'));
      fs.copyFileSync(path.join(root, 'frontend/public/apple-touch-icon.png'), path.join(outDir, 'apple-touch-icon.png'));
      fs.copyFileSync(path.join(root, 'frontend/public/icon-192.png'), path.join(outDir, 'icon-192.png'));
      fs.copyFileSync(path.join(root, 'frontend/public/icon-512.png'), path.join(outDir, 'icon-512.png'));
    }
  }

  console.log('✅ Successfully generated enlarged, tightly cropped, pure white transparent favicons and app icons!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
