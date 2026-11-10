import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy envía las llamadas /api al backend (puerto 3000), así el navegador no se queja de CORS.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
