import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { normalizePublicSiteUrl } from './src/lib/seo/publicOrigin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** HTML comment + official gtag snippet when `VITE_PUBLIC_GA_MEASUREMENT_ID` was set at build time. */
function jatriswapGaBuildHintPlugin(): Plugin {
  let root = process.cwd();
  let mode = 'development';
  return {
    name: 'jatriswap-ga-build-hint',
    configResolved(config) {
      root = config.root;
      mode = config.mode;
    },
    transformIndexHtml(html) {
      if (html.includes('jatriswap-ga:')) return html;
      const env = loadEnv(mode, root, '');
      const measurementId = env.VITE_PUBLIC_GA_MEASUREMENT_ID?.trim();
      const comment = `<!-- jatriswap-ga:${measurementId ? 'measurement-id-at-build' : 'missing-VITE_PUBLIC_GA_MEASUREMENT_ID'} -->`;
      if (!measurementId) {
        return html.replace('<head>', `<head>\n    ${comment}`);
      }

      const id = JSON.stringify(measurementId);
      const snippet = [
        comment,
        `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}" data-jatriswap-ga-measurement-id=${id}></script>`,
        '<script>',
        '  window.dataLayer = window.dataLayer || [];',
        '  function gtag(){dataLayer.push(arguments);}',
        '  gtag("js", new Date());',
        `  gtag("config", ${id});`,
        '</script>',
      ].join('\n    ');

      return html.replace('<head>', `<head>\n    ${snippet}`);
    },
  };
}

/** Regenerate `public/favicon.svg` from `jatriSwapTicketMarkGeometry` when it changes (single source of truth). */
function jatriswapSyncFaviconPlugin(): Plugin {
  const faviconPath = path.resolve(__dirname, 'public/favicon.svg');
  return {
    name: 'jatriswap-sync-favicon',
    async buildStart() {
      const { getJatriSwapFaviconSvgDocument } = await import('./src/lib/branding/jatriSwapFaviconSvg');
      const next = getJatriSwapFaviconSvgDocument();
      let prev = '';
      try {
        prev = await readFile(faviconPath, 'utf8');
      } catch {
        /* first run or missing file */
      }
      if (prev !== next) await writeFile(faviconPath, next, 'utf8');
    },
  };
}

const SITEMAP_PATHS = ['/', '/browse', '/sell', '/contact', '/faq', '/transit', '/terms', '/privacy', '/cookie'] as const;

function toHttpsOrigin(hostOrUrl: string | undefined): string {
  const normalized = normalizePublicSiteUrl(hostOrUrl);
  if (!normalized) return '';
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
  return `https://${normalized}`;
}

function resolvePublicOrigin(root: string, mode: string): string {
  const env = loadEnv(mode, root, '');
  return (
    normalizePublicSiteUrl(env.VITE_PUBLIC_SITE_URL) ||
    toHttpsOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ||
    toHttpsOrigin(env.VERCEL_URL) ||
    'https://jatriswap.vercel.app'
  );
}

function normalizeSeoOrigin(origin: string): string {
  return origin.startsWith('http://') ? origin.replace('http://', 'https://') : origin;
}

function buildSitemapXml(origin: string): string {
  const normalizedOrigin = normalizeSeoOrigin(origin);
  const urlEntries = SITEMAP_PATHS.map((pathName, index) => {
    const loc = `${normalizedOrigin}${pathName === '/' ? '/' : pathName}`;
    const priority = index === 0 ? '1.0' : '0.8';
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;
}

function buildRobotsTxt(origin: string): string {
  const normalizedOrigin = normalizeSeoOrigin(origin);
  return [
    'User-agent: facebookexternalhit',
    'Allow: /',
    '',
    'User-agent: Twitterbot',
    'Allow: /',
    '',
    'User-agent: LinkedInBot',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /admin',
    '',
    `Sitemap: ${normalizedOrigin}/sitemap-main.xml`,
    '',
  ].join('\n');
}

/** Generate robots.txt and a single sitemap file from deployment origin. */
function seoStaticFilesPlugin(): Plugin {
  let root = process.cwd();
  let mode = 'development';
  let outDir = 'dist';
  return {
    name: 'jatriswap-seo-static-files',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      mode = config.mode;
      outDir = config.build.outDir;
    },
    async closeBundle() {
      const distDir = path.resolve(root, outDir);
      const publicOrigin = resolvePublicOrigin(root, mode);
      await mkdir(distDir, { recursive: true });
      await Promise.all([
        writeFile(path.join(distDir, 'sitemap-main.xml'), buildSitemapXml(publicOrigin), 'utf8'),
        writeFile(path.join(distDir, 'robots.txt'), buildRobotsTxt(publicOrigin), 'utf8'),
      ]);
    },
  };
}

export default defineConfig({
  plugins: [jatriswapSyncFaviconPlugin(), react(), tailwindcss(), jatriswapGaBuildHintPlugin(), seoStaticFilesPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // Set DISABLE_HMR=true if hot reload causes issues in constrained environments.
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase'))
            return 'vendor-firebase';
          // Keep React + router + scheduler in one graph to avoid Rollup circular chunk warnings.
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler')
          )
            return 'vendor-react';
          if (id.includes('node_modules/qrcode.react')) return 'vendor-qrcode';
          if (id.includes('motion')) return 'vendor-motion';
          return 'vendor-misc';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
