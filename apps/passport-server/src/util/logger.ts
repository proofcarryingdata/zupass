/**
 * Use in place of `console.log` so that server logs can be turned off.
 */
export function logger(...args: unknown[]): void {
  if (process.env.SUPPRESS_LOGGING === "true") {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...args);
}
