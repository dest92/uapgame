import type { TriMeshData } from './colliderShapes';

export interface Vec3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface CharacterMoveResult {
  readonly position: Vec3Like;
  readonly grounded: boolean;
}

/** Cuerpo del personaje controlado por un character controller cinemático. */
export interface CharacterBody {
  readonly position: Vec3Like;
  move(desired: Vec3Like): CharacterMoveResult;
  teleport(p: Vec3Like): void;
}

/**
 * Puerto de física. El resto del juego depende de esta interfaz, no de Rapier
 * (inversión de dependencias): se puede cambiar de motor o correrla en un servidor.
 */
export interface PhysicsWorld {
  addStaticMesh(mesh: TriMeshData): void;
  addStaticCylinder(center: Vec3Like, halfHeight: number, radius: number): void;
  createCharacter(opts: { position: Vec3Like; radius: number; halfHeight: number }): CharacterBody;
  /** Distancia al primer impacto (ignorando personajes) o null. */
  raycast(origin: Vec3Like, direction: Vec3Like, maxDistance: number): number | null;
  step(dt: number): void;
}
