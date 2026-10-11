const fs = require('fs');
const path = require('path');
const https = require('https');

const imagesDir = path.join(__dirname, '..', 'public', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const images = [
  { name: 'hero-1.jpg', id: 'photo-1517248135467-4c7edcad34c4', w: 960, h: 1200 },
  { name: 'hero-2.jpg', id: 'photo-1550966871-3ed3cdb5ed0c', w: 960, h: 1200 },
  { name: 'hero-3.jpg', id: 'photo-1555396273-367ea4eb4db5', w: 960, h: 1200 },
  { name: 'hero-4.jpg', id: 'photo-1578474846511-04ba529f0b88', w: 960, h: 1200 },
  { name: 'module-qr.jpg', id: 'photo-1544025162-d76694265947', w: 960, h: 720 },
  { name: 'module-pos.jpg', id: 'photo-1501339847302-ac426a4a7cbb', w: 960, h: 720 },
  { name: 'module-kitchen.jpg', id: 'photo-1556910103-1c02745aae4d', w: 960, h: 720 },
  { name: 'module-menu.jpg', id: 'photo-1498837167922-ddd27525d352', w: 960, h: 720 },
  { name: 'module-payments.jpg', id: 'photo-1559339352-11d035aa65de', w: 960, h: 720 },
  { name: 'module-reports.jpg', id: 'photo-1450133064473-71024230f91b', w: 960, h: 720 },
  { name: 'step-1.jpg', id: 'photo-1511632765486-a01980e01a18', w: 1200, h: 800 },
  { name: 'step-2.jpg', id: 'photo-1528605248644-14dd04022da1', w: 1200, h: 800 },
  { name: 'step-3.jpg', id: 'photo-1577219491135-ce391730fb2c', w: 1200, h: 800 },
  { name: 'step-4.jpg', id: 'photo-1563245372-f21724e3856d', w: 1200, h: 800 },
];

function download(img) {
  return new Promise((resolve, reject) => {
    const dest = path.join(imagesDir, img.name);
    const url = `https://images.unsplash.com/${img.id}?auto=format&fit=crop&w=${img.w}&h=${img.h}&q=80`;
    
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redirectRes) => {
          const file = fs.createWriteStream(dest);
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${img.name}`);
            resolve();
          });
        }).on('error', reject);
      } else {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${img.name}`);
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function run() {
  for (const img of images) {
    try {
      await download(img);
    } catch (e) {
      console.error(`Error downloading ${img.name}:`, e.message);
    }
  }
  console.log('All images downloaded successfully.');
}

run();
