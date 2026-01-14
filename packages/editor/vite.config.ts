import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Base path for GitHub Pages deployment
  // Will be '/' in development, '/uswds-pt/' in production
  base: mode === 'production' ? '/uswds-pt/' : '/',

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-grapesjs': ['@grapesjs/studio-sdk', '@grapesjs/studio-sdk/react'],
          'vendor-adapter': ['@uswds-pt/adapter'],
        },
      },
    },
  },
  define: {
    'process.env': {},
  },
}));
