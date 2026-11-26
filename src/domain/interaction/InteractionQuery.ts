import type { Vec2 } from '@shared/geo/types';

export const INTERACTION_RADIUS = 4;

export interface InteractionTarget {
  readonly id: string;
  readonly name: string;
  readonly entrance: Vec2;
}

/** INT-1: objetivo más cercano a menos de `radius` metros de su entrada. */
export function findInteractionTarget(
  position: Vec2, targets: readonly InteractionTarget[], radius = INTERACTION_RADIUS,
): InteractionTarget | null {
  let best: InteractionTarget | null = null;
  let bestD = radius;
  for (const t of targets) {
    const d = Math.hypot(t.entrance.x - position.x, t.entrance.z - position.z);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
