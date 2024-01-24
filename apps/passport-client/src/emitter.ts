export interface Listener<T> {
  (t: T): unknown;
}

export class Emitter<T> {
  private listeners: Set<Listener<T>> = new Set();

  public listen(l: Listener<T>): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  public emit(t: T): void {
    for (const listener of this.listeners) {
      listener(t);
    }
  }
}
