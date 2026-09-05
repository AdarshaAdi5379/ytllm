#!/usr/bin/env node

/**
 * Build-time prerender script for SEO pages.
 *
 * Runs after `vite build` to capture rendered HTML for configured routes.
 * Each route is visited via headless Chrome, React renders into #root,
 * and the resulting DOM is written to dist/<route>/index.html.
 *
 * Usage: node scripts/prerender.mjs
 * Called automatically by the "prerender" npm script.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, createReadStream } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { execSync } from 'node:child_process';
import { prerenderRoutes, SITE_URL } from './prerender-routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DIST = resolve(ROOT, 'dist');
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// ---------------------------------------------------------------------------
// Chrome detection — system Chrome for local, @sparticuz/chromium for Vercel
// ---------------------------------------------------------------------------

async function getChromeExecutablePath() {
  // Try @sparticuz/chromium first (Vercel / serverless)
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    if (chromium && typeof chromium.executablePath === 'function') {
      const path = await chromium.executablePath();
      if (path) return path;
    }
  } catch {
    // Not installed or not available — fall through
  }

  // Fall back to system Chrome
  const candidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium-browser',
    'chromium',
  ];
  for (const cmd of candidates) {
    try {
      return execSync(`which ${cmd}`, { encoding: 'utf-8' }).trim();
    } catch {
      // not found, try next
    }
  }

  throw new Error(
    'No Chrome/Chromium found. Install Google Chrome or add @sparticuz/chromium.'
  );
}

// ---------------------------------------------------------------------------
// Lightweight static file server for dist/
// ---------------------------------------------------------------------------

function startPreviewServer(prerenderPaths) {
  const routeSet = new Set(prerenderPaths);
  return new Promise((resolveServer) => {
    const server = createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      let filePath = join(DIST, urlPath === '/' ? 'index.html' : urlPath);

      // If path has no extension and is a directory, try index.html inside it
      if (existsSync(filePath) && !extname(filePath)) {
        const indexFile = join(filePath, 'index.html');
        if (existsSync(indexFile)) filePath = indexFile;
      }

      // SPA fallback — if file doesn't exist, serve root index.html
      if (!existsSync(filePath)) {
        filePath = join(DIST, 'index.html');
      }

      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // For prerendered HTML routes, inject __PRERENDER_ROUTE__ before the
      // main bundle so main.tsx renders the SEO page instead of the SPA.
      if (ext === '.html' && routeSet.has(urlPath.replace(/^\//, '').replace(/\/$/, ''))) {
        let html = readFileSync(filePath, 'utf-8');
        const route = urlPath.replace(/^\//, '').replace(/\/$/, '');
        html = html.replace(
          /<head>/,
          `<head>\n<script>window.__PRERENDER_ROUTE__="${route}";</script>`
        );
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(html);
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, () => {
      console.log(`  Preview server running on ${BASE_URL}`);
      resolveServer(server);
    });
  });
}

// ---------------------------------------------------------------------------
// Prerender a single route
// ---------------------------------------------------------------------------

async function prerenderRoute(page, route) {
  const url = `${BASE_URL}/${route.path}`;
  console.log(`  Prerendering: ${route.path || '/'} ...`);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for React to mount — check that #root has children
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    },
    { timeout: 15000 }
  );

  // Small delay for any remaining hydration/render effects
  await new Promise((r) => setTimeout(r, 500));

  // Move page-specific <title>, <meta>, <link> from <body> to <head>
  // Also remove the original SPA tags that came from index.html
  await page.evaluate(() => {
    const head = document.head;
    const body = document.body;

    // Remove original SPA tags from <head> (generic title, description, canonical, OG)
    const spaTitle = head.querySelector('title');
    if (spaTitle) spaTitle.remove();
    head.querySelectorAll('meta[name="description"]').forEach((m) => m.remove());
    head.querySelectorAll('link[rel="canonical"]').forEach((l) => l.remove());
    head.querySelectorAll('meta[property^="og:"]').forEach((m) => m.remove());
    head.querySelectorAll('meta[name^="twitter:"]').forEach((m) => m.remove());

    // Move page-specific <title> from <body> to <head>
    body.querySelectorAll('title').forEach((t) => {
      head.appendChild(t);
    });

    // Move page-specific <meta> from <body> to <head>
    body.querySelectorAll('meta[name="description"]').forEach((m) => {
      head.appendChild(m);
    });
    body.querySelectorAll('link[rel="canonical"]').forEach((l) => {
      head.appendChild(l);
    });
    body.querySelectorAll('meta[property^="og:"]').forEach((m) => {
      head.appendChild(m);
    });
    body.querySelectorAll('meta[name^="twitter:"]').forEach((m) => {
      head.appendChild(m);
    });
  });

  // Capture the fully rendered HTML
  const html = await page.content();

  // Write to dist/<route>/index.html
  const outDir = resolve(DIST, route.path);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'index.html'), html, 'utf-8');

  console.log(`  ✓ Written: dist/${route.path}/index.html`);
}

// ---------------------------------------------------------------------------
// Sitemap generation
// ---------------------------------------------------------------------------

function generateSitemap() {
  const today = new Date().toISOString().split('T')[0];

  const urls = [
    `  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
  ];

  for (const route of prerenderRoutes) {
    urls.push(`  <url>
    <loc>${SITE_URL}/${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  writeFileSync(resolve(DIST, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`  ✓ Sitemap written: dist/sitemap.xml (${prerenderRoutes.length + 1} URLs)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Prerender: starting...\n');

  // Generate sitemap first (always, even if no routes)
  generateSitemap();

  // Check if there are routes to prerender
  if (prerenderRoutes.length === 0) {
    console.log('  No prerender routes configured. Skipping HTML capture.');
    console.log('  Add routes to scripts/prerender-routes.mjs to enable prerendering.\n');
    return;
  }

  // Start preview server with route awareness for HTML injection
  const server = await startPreviewServer(prerenderRoutes.map((r) => r.path));

  // Launch browser
  const puppeteer = await import('puppeteer-core');
  const chromePath = await getChromeExecutablePath();
  console.log(`  Chrome: ${chromePath}\n`);

  const browser = await puppeteer.default.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Prerender each route
  let successCount = 0;
  let failCount = 0;

  for (const route of prerenderRoutes) {
    try {
      await prerenderRoute(page, route);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Failed: ${route.path} — ${err.message}`);
      failCount++;
    }
  }

  // Cleanup
  await browser.close();
  server.close();

  console.log(`\nPrerender complete: ${successCount} succeeded, ${failCount} failed.`);
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
