import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Static SPA for the CCA-F exam prep app. Served in production by a Cloudflare
// Worker with SPA fallback, so client-side routing must resolve from any path.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Pinned per AGENTS.md — do not use Vite's default 5173.
    port: 5837,
    strictPort: true,
  },
  preview: {
    port: 5837,
    strictPort: true,
  },
});
