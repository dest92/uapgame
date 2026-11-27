import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { heroAssetsPlugin } from './vite-plugins/heroAssets.ts';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));

/** ARTIFACT=1: un solo bundle JS (sin chunks) para inlinearlo en un Artifact de claude.ai. */
const artifact = process.env['ARTIFACT'] === '1';

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
    outDir: artifact ? 'dist-artifact' : 'dist',
    rolldownOptions: artifact ? { output: { inlineDynamicImports: true } } : {
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
