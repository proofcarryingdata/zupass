export interface Listener<T> {
  (t: T): unknown;
}

export class Emitter<T> {
  private listeners: Array<Listener<T>> = [];

  public listen(l: Listener<T>): void {
    this.listeners.push(l);
  }

  public emit(t: T) {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](t);
    }
  }
}
