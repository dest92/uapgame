import RAPIER from '@dimforge/rapier3d-compat';
import type { CharacterBody, CharacterMoveResult, PhysicsWorld, Vec3Like } from './PhysicsWorld';
import type { TriMeshData } from './colliderShapes';

/**
 * Grupos de colisión de Rapier: 16 bits altos = pertenencia, 16 bajos = filtro.
 * Dos colliders interactúan si (a.pertenencia & b.filtro) && (b.pertenencia & a.filtro).
 */
const STATIC = 0x0001;
const CHARACTER = 0x0002;
const groups = (membership: number, filter: number): number => ((membership << 16) | filter) >>> 0;
const STATIC_GROUPS = groups(STATIC, 0xffff);
const CHARACTER_GROUP = groups(CHARACTER, STATIC);
/** Rayos de cámara: solo contra estáticos (excluye personajes). */
const CAMERA_RAY_GROUPS = groups(0xffff, STATIC);

class RapierCharacter implements CharacterBody {
  constructor(
    private readonly world: RAPIER.World,
    private readonly body: RAPIER.RigidBody,
    private readonly collider: RAPIER.Collider,
    private readonly controller: RAPIER.KinematicCharacterController,
  ) {}

  get position(): Vec3Like {
    return this.body.translation();
  }

  move(desired: Vec3Like): CharacterMoveResult {
    this.controller.computeColliderMovement(this.collider, desired);
    const m = this.controller.computedMovement();
    const p = this.body.translation();
    const next = { x: p.x + m.x, y: p.y + m.y, z: p.z + m.z };
    this.body.setNextKinematicTranslation(next);
    return { position: next, grounded: this.controller.computedGrounded() };
  }

  teleport(p: Vec3Like): void {
    this.body.setTranslation(p, true);
    this.body.setNextKinematicTranslation(p);
    this.world.propagateModifiedBodyPositionsToColliders();
  }
}

/** Adaptador Rapier del puerto PhysicsWorld. */
export class RapierPhysicsWorld implements PhysicsWorld {
  private constructor(private readonly world: RAPIER.World) {}

  static async create(): Promise<RapierPhysicsWorld> {
    await RAPIER.init();
    return new RapierPhysicsWorld(new RAPIER.World({ x: 0, y: -9.81, z: 0 }));
  }

  addStaticMesh(mesh: TriMeshData): void {
    const desc = RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices).setCollisionGroups(STATIC_GROUPS);
    this.world.createCollider(desc);
  }

  addStaticCylinder(c: Vec3Like, halfHeight: number, radius: number): void {
    const desc = RAPIER.ColliderDesc.cylinder(halfHeight, radius).setTranslation(c.x, c.y, c.z).setCollisionGroups(STATIC_GROUPS);
    this.world.createCollider(desc);
  }

  createCharacter(opts: { position: Vec3Like; radius: number; halfHeight: number }): CharacterBody {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(opts.position.x, opts.position.y, opts.position.z));
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule(opts.halfHeight, opts.radius).setCollisionGroups(CHARACTER_GROUP),
      body,
    );
    const controller = this.world.createCharacterController(0.03);
    controller.setUp({ x: 0, y: 1, z: 0 });
    controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((60 * Math.PI) / 180);
    controller.enableAutostep(0.4, 0.2, true);
    controller.enableSnapToGround(0.45);
    controller.setApplyImpulsesToDynamicBodies(false);
    return new RapierCharacter(this.world, body, collider, controller);
  }

  raycast(origin: Vec3Like, dir: Vec3Like, maxDistance: number): number | null {
    const hit = this.world.castRay(new RAPIER.Ray(origin, dir), maxDistance, true, undefined, CAMERA_RAY_GROUPS);
    return hit ? hit.timeOfImpact : null;
  }

  step(dt: number): void {
    this.world.timestep = dt;
    this.world.step();
  }
}
