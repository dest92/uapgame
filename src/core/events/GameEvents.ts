import type { QualityLevel } from '../../domain/quality/QualityProfiles';

/** Catálogo de eventos de la aplicación. */
export interface GameEvents extends Record<string, unknown> {
  'loading:progress': { stage: string; progress: number };
  'interaction:target': { buildingId: string; name: string } | null;
  'interaction:open': { buildingId: string };
  'interaction:close': undefined;
  'settings:quality': QualityLevel;
  'settings:timeOfDay': number;
  'debug:toggle': undefined;
}
