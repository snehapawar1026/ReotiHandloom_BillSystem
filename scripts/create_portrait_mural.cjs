const sharp = require('sharp');
const path = require('path');

async function createMasterMergedArtwork() {
  const targetW = 1200;
  const targetH = 1100;
  
  // Left: Ahilyabai (width 700, height 1100)
  const leftBuf = await sharp(path.join(__dirname, '../public/ahilyabai_vintage_sketch.jpg'))
    .resize(800, targetH, { fit: 'cover', position: 'left' })
    .modulate({ brightness: 0.99, saturation: 1.05 })
    .toBuffer();

  // Right: Loom & Weaver (width 700, height 1100)
  const rightBuf = await sharp(path.join(__dirname, '../public/maheshwari_pit_loom_sketch.jpg'))
    .resize(800, targetH, { fit: 'cover', position: 'right' })
    .modulate({ brightness: 0.98, saturation: 1.15 })
    .toBuffer();

  // Smooth sigmoid alpha gradient across 160px for the right side overlay
  const maskSvg = Buffer.from(`
    <svg width="700" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="6%" stop-color="#ffffff" stop-opacity="0.05" />
          <stop offset="15%" stop-color="#ffffff" stop-opacity="0.3" />
          <stop offset="25%" stop-color="#ffffff" stop-opacity="0.75" />
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="700" height="${targetH}" fill="url(#grad)" />
    </svg>
  `);

  const maskedRight = await sharp(rightBuf)
    .ensureAlpha()
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Composite left and masked right
  await sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 4,
      background: { r: 242, g: 234, b: 218, alpha: 1 }
    }
  })
  .composite([
    { input: leftBuf, left: 0, top: 0 },
    { input: maskedRight, left: 500, top: 0 }
  ])
  .jpeg({ quality: 98 })
  .toFile(path.join(__dirname, '../public/maheshwar_heritage_mural_portrait.jpg'));

  await sharp(path.join(__dirname, '../public/maheshwar_heritage_mural_portrait.jpg'))
    .png()
    .toFile(path.join(__dirname, '../public/maheshwar_heritage_mural_portrait.png'));

  console.log('Seamless blend generated!');
}

createMasterMergedArtwork().catch(console.error);
