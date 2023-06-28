/**
 * Use in place of `console.log` so that server logs can be turned off.
 */
export function logger(...args: any[]) {
  if (process.env.SUPPRESS_LOGGING === "true") {
    return;
  }

  console.log(...args);
}
