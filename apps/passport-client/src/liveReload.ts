import { appConfig } from "./appConfig";

export function enableLiveReload(): void {
  if (appConfig.devMode) {
    new EventSource("/esbuild").addEventListener("change", () => {
      location.reload();
    });
  }
}
