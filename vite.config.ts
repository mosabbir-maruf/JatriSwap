import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { emitSitemapAndRobots, resolveSitemapBuildOrigin } from './src/lib/seo/sitemapBuild';
import { SITEMAP_PUBLIC_PATHS } from './src/lib/seo/sitemapPublicPaths';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Emits `sitemap.xml` and appends `Sitemap:` to `robots.txt` when a public origin is resolved (env or Vercel). */
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
      const base = resolveSitemapBuildOrigin(env);
      const dir = outputOptions.dir;
      if (!base || !dir) return;
      emitSitemapAndRobots({
        distDir: dir,
        projectRoot: root,
        base,
        publicPaths: SITEMAP_PUBLIC_PATHS,
      });
    },
  };
}

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
