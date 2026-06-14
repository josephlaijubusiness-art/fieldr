import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the dashboard runs on its own port, so API calls to
// "/api/..." are forwarded ("proxied") to the backend on port 3001.
// In production both will live behind app.fieldr.ie, so the same
// relative URLs keep working with no code changes.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
