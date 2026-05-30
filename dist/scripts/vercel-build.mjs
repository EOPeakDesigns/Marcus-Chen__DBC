/**
 * Vercel production build: assemble a complete static site into /dist.
 * Vercel deploys ONLY the output directory — index.html must live there.
 */
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const ROOT_FILES = [
  'index.html',
  'offline.html',
  'sw.js',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'health.txt'
];

const COPY_DIRS = ['assets', 'data', 'js', 'scripts', 'styles'];

async function generateIcons() {
  try {
    execSync('node scripts/generate-pwa-icons.mjs', { cwd: root, stdio: 'inherit' });
  } catch (err) {
    console.warn('[vercel-build] PWA icon generation skipped:', err.message || err);
  }
}

async function copySite() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const file of ROOT_FILES) {
    const src = join(root, file);
    try {
      await access(src);
      await cp(src, join(dist, file));
      console.log(`[vercel-build] + ${file}`);
    } catch {
      console.warn(`[vercel-build] missing optional file: ${file}`);
    }
  }

  for (const dir of COPY_DIRS) {
    const src = join(root, dir);
    try {
      await access(src);
      await cp(src, join(dist, dir), { recursive: true });
      console.log(`[vercel-build] + ${dir}/`);
    } catch {
      console.warn(`[vercel-build] missing directory: ${dir}/`);
    }
  }
}

async function main() {
  console.log('[vercel-build] Starting…');
  await generateIcons();
  await copySite();

  try {
    await access(join(dist, 'index.html'));
  } catch {
    console.error('[vercel-build] FATAL: dist/index.html was not created.');
    process.exit(1);
  }

  console.log('[vercel-build] Success — dist/ is ready for Vercel.');
}

main().catch((err) => {
  console.error('[vercel-build] Failed:', err);
  process.exit(1);
});
