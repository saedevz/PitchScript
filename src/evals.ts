export interface SavedEval {
  readonly name: string;
  readonly source: string;
  readonly description?: string;
}

export class EvalRegistry {
  private readonly evals = new Map<string, SavedEval>();

  register(evaluation: SavedEval): void {
    const name = evaluation.name.trim();

    if (!name) {
      throw new Error("Eval name cannot be empty.");
    }

    if (!evaluation.source.trim()) {
      throw new Error("Eval source cannot be empty.");
    }

    const key = name.toLowerCase();

    if (this.evals.has(key)) {
      throw new Error(`Eval "${name}" already exists.`);
    }

    this.evals.set(key, {
      ...evaluation,
      name,
    });
  }

  get(name: string): SavedEval | undefined {
    return this.evals.get(name.trim().toLowerCase());
  }

  list(): readonly SavedEval[] {
    return [...this.evals.values()];
  }

  delete(name: string): boolean {
    return this.evals.delete(name.trim().toLowerCase());
  }
}
