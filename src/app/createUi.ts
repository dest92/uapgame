import type { BuildingInfoFile } from '@shared/info/types';
import type { WorldData } from '@shared/world/types';
import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import type { GameSystem } from '../core/loop/GameLoop';
import type { GameState } from '../core/state/GameState';
import { mountAttribution } from '../ui/Attribution';
import { DebugOverlay, type RenderStats } from '../ui/DebugOverlay';
import { el } from '../ui/dom';
import { InfoPanel } from '../ui/InfoPanel';
import { InteractionHint } from '../ui/InteractionHint';
import { Minimap } from '../ui/Minimap';
import { APP_CONFIG } from './config';

export interface UiDeps {
  readonly container: HTMLElement;
  readonly bus: EventBus<GameEvents>;
  readonly world: WorldData;
  readonly info: BuildingInfoFile;
  readonly state: GameState;
  readonly touch: boolean;
  readonly cameraYaw: () => number;
  readonly stats: () => RenderStats;
  readonly backendLabel: string;
}

/** Monta el HUD y devuelve el sistema que lo actualiza cada frame. */
export function createUi(d: UiDeps): { hud: HTMLElement; system: GameSystem } {
  const hud = el('div', { className: 'hud' });
  d.container.appendChild(hud);
  new InteractionHint(hud, d.bus, d.touch);
  new InfoPanel(hud, d.bus, d.info);
  const minimap = new Minimap(hud, d.world);
  const debug = new DebugOverlay(hud, d.bus, d.stats);
  mountAttribution(hud, `Elevación: IGN Argentina · ${d.backendLabel}`);
  hud.appendChild(el('div', { className: 'brand', text: 'ACHE SYSTEMS' }));
  if (!d.touch) {
    hud.appendChild(el('div', { className: 'help glass', text: 'WASD mover · Shift correr · Espacio saltar · Mouse mirar · E interactuar · F3 debug' }));
  }
  return {
    hud,
    system: {
      update: (dt) => {
        const p = d.state.get(APP_CONFIG.playerEntityId)?.position;
        if (p) minimap.update({ x: p.x, z: p.z }, d.cameraYaw());
        debug.update(dt);
      },
    },
  };
}
