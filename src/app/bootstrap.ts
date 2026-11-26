import worldUrl from '../../data/world.json?url';
import heroAssets from 'virtual:hero-assets';
import { GameLoop } from '../core/loop/GameLoop';
import { createRenderer } from '../render/RendererFactory';
import { RenderSystem } from '../render/RenderSystem';
import { SceneContext } from '../render/scene/SceneContext';
import { addBasicLighting } from '../render/scene/BasicLighting';
import { BasicMaterialLibrary } from '../render/materials/BasicMaterialLibrary';
import { backendLabel } from '../render/backend';
import { loadWorld } from '../world/WorldLoader';
import { buildWorldScene } from '../world/WorldBuilder';
import { LoadingScreen } from '../ui/LoadingScreen';
import { mountAttribution } from '../ui/Attribution';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Raíz de composición: crea e inyecta dependencias. Sin lógica de juego. */
export async function bootstrap(container: HTMLElement): Promise<void> {
  const loading = new LoadingScreen(container);
  try {
    loading.progress('Inicializando renderer…', 0.05);
    const canvas = document.createElement('canvas');
    container.prepend(canvas);
    const { renderer, backend } = await createRenderer(canvas, true);
    document.documentElement.dataset['backend'] = backendLabel(backend);

    loading.progress('Descargando datos del campus…', 0.1);
    const world = await loadWorld(worldUrl, (p) => loading.progress('Descargando datos del campus…', 0.1 + p * 0.3));

    loading.progress('Generando edificios, calles y terreno…', 0.45);
    const ctx = new SceneContext();
    addBasicLighting(ctx.scene);
    const built = buildWorldScene(world, new BasicMaterialLibrary(), {
      ground: { cellSize: 8, splatPxPerMeter: 2, splatMaxSize: 2048 },
      skipBuildings: new Set(Object.keys(heroAssets).map((k) => k.replace('-', '/'))),
    });
    ctx.scene.add(built.root);

    const controls = new OrbitControls(ctx.camera, canvas);
    ctx.camera.position.set(-260, 220, 320);
    controls.target.set(0, built.terrain.heightAt(0, 0), 0);
    controls.update();

    const renderSystem = new RenderSystem(renderer, ctx, container);
    loading.progress('Compilando shaders…', 0.85);
    await renderer.compileAsync(ctx.scene, ctx.camera);

    mountAttribution(container, `Terreno: IGN Argentina · Render: ${backendLabel(backend)}`);
    new GameLoop().add({ update: () => controls.update() }).add(renderSystem).start();
    loading.progress('Listo', 1);
    loading.hide();
  } catch (err) {
    console.error(err);
    loading.error(`No se pudo iniciar: ${err instanceof Error ? err.message : String(err)}`);
  }
}
