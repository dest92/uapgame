import type { EventBus } from '../core/events/EventBus';
import type { GameEvents } from '../core/events/GameEvents';
import type { VisitQuest } from '../domain/quests/VisitQuest';
import { el } from './dom';

/** Panel del objetivo de recorrido y avisos de progreso (QST-1). */
export function mountQuestPanel(parent: HTMLElement, bus: EventBus<GameEvents>, quest: VisitQuest): void {
  const count = el('span', { className: 'quest__count' });
  const next = el('div', { className: 'quest__next' });
  parent.appendChild(el('div', { className: 'quest glass' }, [el('div', { className: 'quest__title', text: 'Recorré el campus' }), count, next]));
  const render = (): void => {
    const p = quest.progress;
    count.textContent = `${p.visited}/${p.total} edificios`;
    const r = quest.remaining();
    next.textContent = quest.isDone ? '¡Recorrido completo!' : `Próximo: ${r[0]?.name ?? ''}`;
  };
  render();
  bus.on('interaction:open', ({ buildingId }) => {
    const r = quest.visit(buildingId);
    if (!r.newly) return;
    const p = quest.progress;
    bus.emit('hud:toast', r.done ? `¡Recorriste los ${p.total} edificios del campus!` : `Visitaste: ${r.name} (${p.visited}/${p.total})`);
    render();
  });
}
