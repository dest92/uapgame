import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { heroAssetsPlugin } from './vite-plugins/heroAssets';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));

export default defineConfig({
  base: './',
  publicDir,
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('./shared', import.meta.url)) },
  },
  assetsInclude: ['**/*.glb', '**/*.ktx2'],
  plugins: [heroAssetsPlugin(publicDir)],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three/ },
            { name: 'rapier', test: /node_modules[\\/]@dimforge/ },
          ],
        },
      },
    },
  },
  server: { host: true },
});
