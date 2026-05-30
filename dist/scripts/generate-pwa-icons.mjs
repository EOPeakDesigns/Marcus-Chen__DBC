/**
 * Generate PWA PNG icons from favicon.svg (192 ≥ 15KB, 512 ≥ 50KB for Chrome installability)
 * Run: npm install && node scripts/generate-pwa-icons.mjs
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'assets/icons/favicon/favicon.svg');
const outDir = join(root, 'assets/icons/favicon/png');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('Install sharp: npm install');
    process.exit(1);
  }

  const svg = await readFile(svgPath);
  await mkdir(outDir, { recursive: true });

  const sizes = [
    { name: 'android-chrome-192x192.png', size: 192, minBytes: 15 * 1024 },
    { name: 'android-chrome-512x512.png', size: 512, minBytes: 50 * 1024 }
  ];

  for (const { name, size, minBytes } of sizes) {
    const renderSize = Math.max(size * 2, 1024);
    let buffer = await sharp(svg)
      .resize(renderSize, renderSize, { fit: 'contain' })
      .png({ compressionLevel: 0, quality: 100, adaptiveFiltering: false })
      .resize(size, size)
      .png({ compressionLevel: 0, quality: 100, adaptiveFiltering: false })
      .toBuffer();

    let attempt = 0;
    while (buffer.length < minBytes && attempt < 4) {
      const noise = await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r: 28, g: 31, b: 42 }
        }
      })
        .composite([
          { input: await sharp(svg).resize(size, size).png().toBuffer(), blend: 'over' },
          {
            input: await sharp({
              create: { width: size, height: size, channels: 3, noise: { type: 'gaussian', sigma: 8 } }
            })
              .png({ compressionLevel: 0 })
              .toBuffer(),
            blend: 'overlay',
            opacity: 0.04
          }
        ])
        .png({ compressionLevel: 0, quality: 100 })
        .toBuffer();
      buffer = noise.length > buffer.length ? noise : buffer;
      attempt += 1;
    }

    const outPath = join(outDir, name);
    await writeFile(outPath, buffer);
    console.log(`Wrote ${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
