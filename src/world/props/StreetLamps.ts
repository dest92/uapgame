import { InstancedMesh, Matrix4, Quaternion, Vector3, type Group } from 'three/webgpu';
import type { HeightSampler } from '@shared/terrain/heightField';
import type { RoadData } from '@shared/world/types';
import { emptyGeometry, pushVertex, toBufferGeometry, type GeometryData } from '../geometry/GeometryData';
import type { VegetationMaterials } from '../vegetation/VegetationMaterials';

const SPACING = 32;
const HEIGHT = 6.5;

function box(g: GeometryData, c: [number, number, number], s: [number, number, number]): void {
  const faces: [[number, number, number], [number, number, number], [number, number, number]][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [n, u, v] of faces) {
    const base = g.positions.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
      const p: [number, number, number] = [0, 1, 2].map((k) => c[k]! + (n[k]! + u[k]! * a + v[k]! * b) * s[k]! / 2) as [number, number, number];
      pushVertex(g, { p, n, uv: [(a + 1) / 2, (b + 1) / 2], color: [1, 1, 1] });
    }
    g.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
}

/** Posiciones de faroles a un costado de las calles (uno cada ~32 m). */
export function lampPositions(roads: readonly RoadData[]): { x: number; z: number; yaw: number }[] {
  const out: { x: number; z: number; yaw: number }[] = [];
  for (const r of roads.filter((x) => x.class === 'road')) {
    let carry = SPACING / 2;
    for (let i = 0; i < r.points.length - 1; i++) {
      const a = r.points[i]!;
      const b = r.points[i + 1]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 1e-3) continue;
      const tx = (b.x - a.x) / len;
      const tz = (b.z - a.z) / len;
      for (let d = carry; d < len; d += SPACING) {
        const off = r.width / 2 + 0.9;
        out.push({ x: a.x + tx * d - tz * off, z: a.z + tz * d + tx * off, yaw: Math.atan2(tz, -tx) });
      }
      carry = ((carry - len) % SPACING + SPACING) % SPACING;
    }
  }
  return out;
}

/** Faroles instanciados: poste + brazo (metal) y cabezal emisivo de noche (SKY-3). */
export function buildStreetLamps(group: Group, roads: readonly RoadData[], terrain: HeightSampler, mats: VegetationMaterials): { x: number; z: number }[] {
  const pole = emptyGeometry();
  box(pole, [0, HEIGHT / 2, 0], [0.14, HEIGHT, 0.14]);
  box(pole, [0.7, HEIGHT - 0.05, 0], [1.4, 0.08, 0.08]);
  const head = emptyGeometry();
  box(head, [1.35, HEIGHT - 0.16, 0], [0.55, 0.12, 0.28]);
  const pts = lampPositions(roads);
  const poles = new InstancedMesh(toBufferGeometry(pole), mats.lampPole(), pts.length);
  const heads = new InstancedMesh(toBufferGeometry(head), mats.lampHead(), pts.length);
  const m = new Matrix4();
  pts.forEach((p, i) => {
    m.compose(new Vector3(p.x, terrain.heightAt(p.x, p.z), p.z), new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), p.yaw), new Vector3(1, 1, 1));
    poles.setMatrixAt(i, m);
    heads.setMatrixAt(i, m);
  });
  poles.castShadow = true;
  group.add(poles, heads);
  return pts;
}
