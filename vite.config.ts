import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { SITEMAP_PUBLIC_PATHS } from './src/lib/seo/sitemapPublicPaths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Emits `sitemap.xml` and appends `Sitemap:` to `robots.txt` when `VITE_PUBLIC_SITE_URL` is set at build time. */
function jatriswapSeoArtifactsPlugin(): Plugin {
  let root = process.cwd();
  let mode = 'production';
  return {
    name: 'jatriswap-seo-artifacts',
    configResolved(config) {
      root = config.root;
      mode = config.mode;
    },
    writeBundle(outputOptions) {
      const env = loadEnv(mode, root, '');
      const base = (env.VITE_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
      const dir = outputOptions.dir;
      if (!base || !dir) return;

      const urlEntries = SITEMAP_PUBLIC_PATHS.map((p) => {
        const loc = p === '/' ? base : `${base}${p}`;
        const priority = p === '/' ? '1.0' : '0.8';
        return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      });
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;
      fs.writeFileSync(path.join(dir, 'sitemap.xml'), xml, 'utf-8');

      const robotsSrc = path.join(root, 'public', 'robots.txt');
      if (!fs.existsSync(robotsSrc)) return;
      const baseRobots = fs.readFileSync(robotsSrc, 'utf-8').replace(/\s+$/, '');
      const robotsOut = `${baseRobots}\n\nSitemap: ${base}/sitemap.xml\n`;
      fs.writeFileSync(path.join(dir, 'robots.txt'), robotsOut, 'utf-8');
    },
  };
}

/** HTML comment: View Source shows whether `VITE_PUBLIC_GA_MEASUREMENT_ID` was set when Vite built `index.html`. */
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
      const has = Boolean(env.VITE_PUBLIC_GA_MEASUREMENT_ID?.trim());
      const comment = `<!-- jatriswap-ga:${has ? 'measurement-id-at-build' : 'missing-VITE_PUBLIC_GA_MEASUREMENT_ID'} -->`;
      return html.replace('<head>', `<head>\n    ${comment}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), jatriswapGaBuildHintPlugin(), jatriswapSeoArtifactsPlugin()],
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
          if (id.includes('motion')) return 'vendor-motion';
          return 'vendor-misc';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
