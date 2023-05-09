import { mountApplication } from "@pcd/passport-client-ui/pages/index";

const localStorage: Map<string, string> = new Map();
const sessionStorage: Map<string, string> = new Map();

mountApplication(document.querySelector("#root"), {
  devMode: process.env.NODE_ENV !== "production",
  passportServer: process.env.PASSPORT_SERVER_URL,
  maxProofAge: 1000 * 60 * 60 * 4,
  rollbarToken: process.env.ROLLBAR_TOKEN,
  localStorage: {
    setStorageItem: async (key: string, value: string | undefined) => {
      localStorage.set(key, value);
    },
    getStorageItem: async (key: string): Promise<string | undefined> => {
      return localStorage.get(key);
    },
    clearStorage: async () => {
      localStorage.clear();
    },
  },
  sessionStorage: {
    setStorageItem: async (key: string, value: string | undefined) => {
      sessionStorage.set(key, value);
    },
    getStorageItem: async (key: string): Promise<string | undefined> => {
      return sessionStorage.get(key);
    },
    clearStorage: async () => {
      sessionStorage.clear();
    },
  },
});
