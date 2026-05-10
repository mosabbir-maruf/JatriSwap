import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
          if (id.includes('recharts')) return 'vendor-recharts';
          return 'vendor-misc';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
