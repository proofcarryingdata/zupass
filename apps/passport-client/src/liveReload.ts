import { appConfig } from "./appConfig";

// Implement fe part for esbuild live reload - this does not preserve the js state https://esbuild.github.io/api/#live-reload
export function enableLiveReload(): void {
  if (appConfig.devMode) {
    new EventSource("/esbuild").addEventListener("change", () => {
      location.reload();
    });
  }
}
