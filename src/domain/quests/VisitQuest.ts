export interface QuestTarget {
  readonly id: string;
  readonly name: string;
}

/** Objetivo "Recorré el campus": visitar edificios clave (QST-1). */
export class VisitQuest {
  private readonly visited = new Set<string>();
  constructor(private readonly targets: readonly QuestTarget[]) {}

  visit(id: string): { newly: boolean; name: string; done: boolean } {
    const t = this.targets.find((x) => x.id === id);
    if (!t || this.visited.has(id)) return { newly: false, name: t?.name ?? '', done: this.isDone };
    this.visited.add(id);
    return { newly: true, name: t.name, done: this.isDone };
  }

  get isDone(): boolean {
    return this.visited.size === this.targets.length;
  }

  get progress(): { visited: number; total: number } {
    return { visited: this.visited.size, total: this.targets.length };
  }

  remaining(): QuestTarget[] {
    return this.targets.filter((t) => !this.visited.has(t.id));
  }
}
