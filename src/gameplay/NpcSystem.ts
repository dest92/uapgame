import type { AnimationClip, Scene } from 'three/webgpu';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { RoadData } from '@shared/world/types';
import type { GameSystem } from '../core/loop/GameLoop';
import { PathFollower } from '../domain/npc/PathFollower';
import { mulberry32 } from '../domain/vegetation/scatter';
import { CharacterView } from '../player/CharacterView';
import type { Outfit } from '../render/materials/clothingMaterial';

const OUTFITS: readonly Outfit[] = [
  { shirt: '#d9d4c7', pants: '#2a3446', shoes: '#ecebe6' },
  { shirt: '#7a2a2a', pants: '#3b3a36', shoes: '#1d1d1f' },
  { shirt: '#2e6b4f', pants: '#26303f', shoes: '#ecebe6' },
  { shirt: '#e2b04a', pants: '#3a4a63', shoes: '#c9c4b8' },
  { shirt: '#f2f2f0', pants: '#1f2a3a', shoes: '#ffffff' },
  { shirt: '#44508a', pants: '#5c4a3a', shoes: '#2a2a2a' },
];

/** Estudiantes caminando por los senderos peatonales de OSM (ambiente). */
export class NpcSystem implements GameSystem {
  private readonly npcs: { view: CharacterView; path: PathFollower }[] = [];

  constructor(scene: Scene, model: GLTF, clips: readonly AnimationClip[], roads: readonly RoadData[], private readonly terrain: HeightSampler, count: number) {
    const rand = mulberry32(7);
    const paths = roads
      .filter((r) => r.class === 'path' && r.highway !== 'steps')
      .map((r) => ({ r, len: r.points.reduce((a, p, i) => (i ? a + Math.hypot(p.x - r.points[i - 1]!.x, p.z - r.points[i - 1]!.z) : 0), 0) }))
      .filter((x) => x.len > 25)
      .sort((a, b) => b.len - a.len)
      .slice(0, count);
    paths.forEach(({ r }, i) => {
      const view = new CharacterView({ scene: cloneSkinned(model.scene) as GLTF['scene'] }, clips, OUTFITS[i % OUTFITS.length]);
      view.play('walk', 0);
      view.setSpeed('walk', 1.2 + rand() * 0.3);
      scene.add(view.root);
      this.npcs.push({ view, path: new PathFollower(r.points, 1.15 + rand() * 0.35, rand()) });
    });
  }

  update(dt: number): void {
    for (const { view, path } of this.npcs) {
      path.step(dt);
      const p = path.position;
      view.sync({ x: p.x, y: this.terrain.heightAt(p.x, p.z), z: p.z }, path.heading, dt);
    }
  }
}
