import { mountApplication } from "@pcd/passport-client-ui/pages/index";
import { registerServiceWorker } from "../src/registerServiceWorker";

mountApplication(document.querySelector("#root"), {
  devMode: process.env.NODE_ENV !== "production",
  passportServer: process.env.PASSPORT_SERVER_URL,
  maxProofAge: 1000 * 60 * 60 * 4,
  rollbarToken: process.env.ROLLBAR_TOKEN,
  localStorage: {
    clearStorage: async () => window.localStorage.clear(),
    getStorageItem: async (key: string) => window.localStorage.getItem(key),
    setStorageItem: async (key: string, value: string) =>
      window.localStorage.setItem(key, value),
  },
  sessionStorage: {
    clearStorage: async () => window.sessionStorage.clear(),
    getStorageItem: async (key: string) => window.sessionStorage.getItem(key),
    setStorageItem: async (key: string, value: string) =>
      window.sessionStorage.setItem(key, value),
  },
});

registerServiceWorker();
