import { sleep } from "@pcd/util";
import logSymbols from "log-symbols";

export abstract class TimerCase {
  name: string;
  constructor(name: string) {
    this.name = name;
  }

  abstract init(): Promise<void>;
  abstract setup(): Promise<void>;
  abstract op(): Promise<void>;
}

export class DemoCase extends TimerCase {
  constructor() {
    super("demo");
  }
  async init(): Promise<void> {
    await sleep(1000);
    console.info(`${logSymbols.success}`, "init()");
  }
  async setup(): Promise<void> {
    await sleep(1000);
    console.info(`${logSymbols.success}`, "setup()");
  }
  async op(): Promise<void> {
    await sleep(100);
    console.info(`${logSymbols.success}`, "op()");
  }
}
