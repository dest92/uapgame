import { describe, it, expect } from 'vitest';
import { VisitQuest } from '../../../src/domain/quests/VisitQuest';

describe('VisitQuest (QST-1)', () => {
  const targets = [{ id: 'a', name: 'Templo' }, { id: 'b', name: 'Biblioteca' }];
  it('QST-1: cuenta visitas únicas y avisa al completar', () => {
    const q = new VisitQuest(targets);
    expect(q.visit('a')).toEqual({ newly: true, name: 'Templo', done: false });
    expect(q.visit('a').newly).toBe(false);
    expect(q.visit('zzz').newly).toBe(false);
    expect(q.visit('b')).toMatchObject({ newly: true, done: true });
    expect(q.progress).toEqual({ visited: 2, total: 2 });
  });
});
