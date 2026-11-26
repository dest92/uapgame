import worldUrl from '../../data/world.json?url';
import infoUrl from '../../data/buildings-info.json?url';
import heroAssets from 'virtual:hero-assets';
import type { BuildingInfoFile } from '@shared/info/types';
import { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import { InputHub } from '../core/input/InputHub';
import { KeyboardMouseSource } from '../core/input/KeyboardMouseSource';
import { GameLoop } from '../core/loop/GameLoop';
import { GameState } from '../core/state/GameState';
import { InteractionSystem } from '../gameplay/InteractionSystem';
import { AssetLoader } from '../render/assets/AssetLoader';
import { backendLabel } from '../render/backend';
import { BasicMaterialLibrary } from '../render/materials/BasicMaterialLibrary';
import { createRenderer } from '../render/RendererFactory';
import { RenderSystem } from '../render/RenderSystem';
import { addBasicLighting } from '../render/scene/BasicLighting';
import { SceneContext } from '../render/scene/SceneContext';
import { LoadingScreen } from '../ui/LoadingScreen';
import { TouchControls } from '../ui/TouchControls';
import { loadWorld } from '../world/WorldLoader';
import { buildWorldScene } from '../world/WorldBuilder';
import { APP_CONFIG } from './config';
import { createPhysics } from './createPhysics';
import { createPlayer } from './createPlayer';
import { createUi } from './createUi';

const isTouch = (): boolean => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

/** Raíz de composición: crea e inyecta dependencias. Sin lógica de juego. */
export async function bootstrap(container: HTMLElement): Promise<void> {
  const loading = new LoadingScreen(container);
  const stage = (label: string, p: number): void => loading.progress(label, p);
  try {
    stage('Inicializando renderer…', 0.03);
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    container.prepend(canvas);
    const { renderer, backend } = await createRenderer(canvas, true);
    document.documentElement.dataset['backend'] = backendLabel(backend);

    stage('Descargando datos del campus…', 0.08);
    const [world, info] = await Promise.all([
      loadWorld(worldUrl, (p) => stage('Descargando datos del campus…', 0.08 + p * 0.2)),
      fetch(infoUrl).then((r) => r.json() as Promise<BuildingInfoFile>),
    ]);

    stage('Generando edificios, calles y terreno…', 0.3);
    const ctx = new SceneContext();
    addBasicLighting(ctx.scene);
    const built = buildWorldScene(world, new BasicMaterialLibrary(), {
      ground: { cellSize: 8, splatPxPerMeter: 2, splatMaxSize: 2048 },
      skipBuildings: new Set(Object.keys(heroAssets).map((k) => k.replace('-', '/'))),
    });
    ctx.scene.add(built.root);

    stage('Preparando física…', 0.45);
    const physics = await createPhysics(world, built.terrain);

    const bus = new EventBus<GameEvents>();
    const state = new GameState();
    const touch = isTouch();
    const input = new InputHub().add(new KeyboardMouseSource(canvas, bus));
    const loop = new GameLoop().add(input);

    stage('Cargando personaje…', 0.55);
    const assets = new AssetLoader(renderer, (l, t) => stage('Cargando personaje…', 0.55 + (l / t) * 0.2));
    const player = await createPlayer({ world, terrain: built.terrain, physics, state, input, assets, ctx, loop });

    const targets = world.buildings.map((b) => ({ id: b.id, name: b.name, entrance: b.entrance.position }));
    loop.add(new InteractionSystem(bus, input, state, APP_CONFIG.playerEntityId, targets));
    const renderSystem = new RenderSystem(renderer, ctx, container);
    const ui = createUi({
      container, bus, world, info, state, touch, backendLabel: backendLabel(backend),
      cameraYaw: () => player.camera.orbit.yaw,
      stats: () => ({ drawCalls: renderer.info.render.drawCalls, triangles: renderer.info.render.triangles, backend: backendLabel(backend), quality: 'medium' }),
    });
    if (touch) input.add(new TouchControls(ui.hud, canvas));
    loop.add(ui.system).add(renderSystem);

    stage('Compilando shaders…', 0.85);
    await renderer.compileAsync(ctx.scene, ctx.camera);
    loop.start();
    stage('Listo', 1);
    loading.hide();
  } catch (err) {
    console.error(err);
    loading.error(`No se pudo iniciar: ${err instanceof Error ? err.message : String(err)}`);
  }
}
