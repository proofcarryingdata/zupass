import { APIResult } from "../api/apiResult";

/**
 * Returns the first error from a list of {@link APIResult}s.
 */
export function getError(
  ...results: (APIResult | undefined)[]
): string | undefined {
  for (const result of results) {
    if (result && !result.success) {
      return result.error;
    }
  }
  return undefined;
}

/**
 * Generates performance measurements and handles creating names for start
 * and end marks.
 */
export class PerformanceMeasurement {
  private name: string;
  private state: "idle" | "running" | "ended" = "idle";

  constructor(name: string, autoStart: boolean = true) {
    this.name = name;
    if (autoStart) {
      this.start();
    }
  }

  public start(): void {
    if (this.state !== "idle") {
      throw new Error(`Performance measurement "${this.name}" already started`);
    }
    this.state = "running";
    performance.mark(`${this.name} start`);
  }

  public end(): void {
    if (this.state !== "running") {
      throw new Error(`Performance measurement "${this.name}" not running`);
    }
    performance.mark(`${this.name} end`);
  }

  public measure(): PerformanceMeasure {
    if (this.state === "running") {
      this.end();
    }
    return performance.measure(
      this.name,
      `${this.name} start`,
      `${this.name} end`
    );
  }
}
