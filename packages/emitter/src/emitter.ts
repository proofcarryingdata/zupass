export interface Listener<T> {
  (t: T): unknown;
}

export class Emitter<T = void> {
  private listeners: Set<Listener<T>> = new Set();

  public listen(l: Listener<T>): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  public emit(t: T) {
    for (const listener of Array.from(this.listeners)) {
      listener(t);
    }
  }
}

export interface Wrapper<T> {
  value: T;
}

export function wrap<T>(t: T): Wrapper<T> {
  return { value: t };
}
