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
import { PbrMaterialLibrary } from '../render/materials/PbrMaterialLibrary';
import { VegetationMaterialLibrary } from '../render/materials/VegetationMaterialLibrary';
import { createRenderer } from '../render/RendererFactory';
import { RenderSystem } from '../render/RenderSystem';
import { SceneContext } from '../render/scene/SceneContext';
import { SkySystem } from '../render/sky/SkySystem';
import { TextureLibrary } from '../render/textures/TextureLibrary';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SettingsMenu } from '../ui/SettingsMenu';
import { TouchControls } from '../ui/TouchControls';
import { buildVegetation } from '../world/vegetation/VegetationBuilder';
import { loadWorld } from '../world/WorldLoader';
import { buildWorldScene } from '../world/WorldBuilder';
import { HeroAssetSystem } from '../world/buildings/HeroAssetSystem';
import { APP_CONFIG } from './config';
import { createPhysics } from './createPhysics';
import { createPlayer } from './createPlayer';
import { createUi } from './createUi';
import { QualityManager } from './QualityManager';

const isTouch = (): boolean => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const initialHour = (): number => Number(new URLSearchParams(location.search).get('hour') ?? 10.5);

/** Raíz de composición: crea e inyecta dependencias. Sin lógica de juego. */
export async function bootstrap(container: HTMLElement): Promise<void> {
  const loading = new LoadingScreen(container);
  const stage = (label: string, p: number): void => loading.progress(label, p);
  try {
    stage('Inicializando renderer…', 0.03);
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    container.prepend(canvas);
    const { renderer, backend } = await createRenderer(canvas, false);
    const backendName = backendLabel(backend);
    document.documentElement.dataset['backend'] = backendName;

    stage('Descargando datos del campus…', 0.06);
    const assets = new AssetLoader(renderer);
    const [world, info, textures] = await Promise.all([
      loadWorld(worldUrl, (p) => stage('Descargando datos del campus…', 0.06 + p * 0.12)),
      fetch(infoUrl).then((r) => r.json() as Promise<BuildingInfoFile>),
      TextureLibrary.load(assets.ktx2, 8, (p) => stage('Cargando texturas…', 0.18 + p * 0.22)),
    ]);

    stage('Generando edificios, calles y terreno…', 0.42);
    const ctx = new SceneContext();
    const heroKeys = new Set(Object.keys(heroAssets).map((k) => k.replace('-', '/')));
    const built = buildWorldScene(world, new PbrMaterialLibrary(textures), {
      ground: { cellSize: 6, splatPxPerMeter: 2, splatMaxSize: 2048 },
      skipBuildings: heroKeys,
    });
    ctx.scene.add(built.root);

    const renderSystem = new RenderSystem(renderer, ctx, container);
    const sky = new SkySystem(renderer, ctx.scene, ctx.camera);
    const quality = new QualityManager({ renderer, scene: ctx.scene, camera: ctx.camera, render: renderSystem, sky });

    stage('Plantando árboles y pasto…', 0.5);
    const vegetation = buildVegetation(world, built.terrain, built.grid, built.splat, new VegetationMaterialLibrary(textures), ctx.camera, quality.profile);
    ctx.scene.add(vegetation.root);
    quality.subscribe({ applyQuality: (q) => vegetation.setGrassDensity(q) });

    stage('Preparando física…', 0.56);
    const physics = await createPhysics(world, built.terrain, [...vegetation.placed.map((t) => t.position), ...vegetation.lamps]);
    const heroes = new HeroAssetSystem(assets, ctx.scene, built.terrain);
    void heroes.load(world.buildings.filter((b) => heroKeys.has(b.id)), heroAssets);

    const bus = new EventBus<GameEvents>();
    const state = new GameState();
    const touch = isTouch();
    const input = new InputHub().add(new KeyboardMouseSource(canvas, bus));
    const loop = new GameLoop().add(input);

    stage('Cargando personaje…', 0.62);
    const player = await createPlayer({ world, terrain: built.terrain, physics, state, input, assets, ctx, loop });
    const targets = world.buildings.map((b) => ({ id: b.id, name: b.name, entrance: b.entrance.position }));
    loop.add(new InteractionSystem(bus, input, state, APP_CONFIG.playerEntityId, targets));

    const ui = createUi({
      container, bus, world, info, state, touch, backendLabel: backendName,
      cameraYaw: () => player.camera.orbit.yaw,
      stats: () => ({ drawCalls: renderer.info.render.drawCalls, triangles: renderer.info.render.triangles, backend: backendName, quality: quality.profile.level }),
    });
    if (touch) input.add(new TouchControls(ui.hud, canvas));
    new SettingsMenu(ui.hud, bus, { quality: quality.profile.level, hour: initialHour(), backend: backendName });
    bus.on('settings:quality', (q) => quality.apply(q, true));
    bus.on('settings:timeOfDay', (h) => sky.setTimeOfDay(h));

    sky.setTimeOfDay(initialHour());
    quality.apply();
    loop.add({
      update: (dt) => {
        const p = state.get(APP_CONFIG.playerEntityId)?.position;
        if (p) sky.setFollowTarget(p.x, p.y, p.z);
        sky.update();
        vegetation.trees.update(dt);
      },
    }).add(ui.system).add(renderSystem);

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
