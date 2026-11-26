import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:hero-assets';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Expone `virtual:hero-assets`: un mapa osmKey → URL con los GLB presentes en
 * `public/models/hero/`. Evita pedir al servidor archivos que no existen y
 * permite sumar hero assets con solo copiar el archivo.
 */
export function heroAssetsPlugin(publicDir: string): Plugin {
  const heroDir = join(publicDir, 'models', 'hero');
  return {
    name: 'uap-hero-assets',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const files = existsSync(heroDir) ? readdirSync(heroDir).filter((f) => f.endsWith('.glb')) : [];
      const entries = files.map((f) => [f.replace(/\.glb$/, ''), `models/hero/${f}`]);
      return `export default Object.freeze(${JSON.stringify(Object.fromEntries(entries))});`;
    },
    configureServer(server) {
      server.watcher.add(heroDir);
      const invalidate = (file: string): void => {
        if (!file.startsWith(heroDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
    },
  };
}
