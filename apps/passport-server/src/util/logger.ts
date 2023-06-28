export function logger(...args: any[]) {
  if (process.env.SUPPRESS_LOGGING === "true") {
    return;
  }

  console.log(...args);
}
