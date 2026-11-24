import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Three.js va en su propio fragmento: sólo se descarga con la escena 3D.
        manualChunks(id) {
          if (/node_modules\/three\//.test(id)) return 'three';
          return undefined;
        },
      },
    },
  },
});
