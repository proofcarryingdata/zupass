import type { ClientConnectionInfo } from "./hooks/useParcnetClient";

export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(" ");
}

export const DEFAULT_CONNECTION_INFO: ClientConnectionInfo = {
  url: process.env.CLIENT_URL ?? "https://staging-rob.zupass.org",
  type: "iframe"
};

export function getConnectionInfo(): ClientConnectionInfo {
  let connectionInfo = DEFAULT_CONNECTION_INFO;
  const storedConnectionInfo = localStorage.getItem("clientConnectionInfo");
  if (storedConnectionInfo) {
    try {
      const parsedConnectionInfo = JSON.parse(
        storedConnectionInfo
      ) as ClientConnectionInfo;
      if (
        parsedConnectionInfo.type === "iframe" &&
        typeof parsedConnectionInfo.url === "string"
      ) {
        connectionInfo = parsedConnectionInfo;
      }
    } catch (_e) {
      // JSON parsing failed
    }
  }
  return connectionInfo;
}
