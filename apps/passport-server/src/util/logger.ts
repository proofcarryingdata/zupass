import process from "process";

const PID = process.pid;

/**
 * Use in place of `console.log` so that server logs can be turned off.
 */
export function logger(...args: unknown[]): void {
  if (process.env.SUPPRESS_LOGGING === "true") {
    return;
  }

  if (process.env.ENABLE_CLUSTER === "true") {
    // eslint-disable-next-line no-console
    console.log(`[${PID}]`, ...args);
  } else {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
