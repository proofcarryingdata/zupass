export abstract class TimerCase {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  abstract init(): Promise<void>;
  abstract setup(iterations: number): Promise<void>;
  abstract op(iteration: number): Promise<void>;
}
