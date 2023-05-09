import { mountApplication } from "@pcd/passport-client-ui/pages/index";

const storage: Map<string, string> = new Map();

mountApplication(document.querySelector("#root"), {
  devMode: process.env.NODE_ENV !== "production",
  passportServer: process.env.PASSPORT_SERVER_URL,
  maxProofAge: 1000 * 60 * 60 * 4,
  rollbarToken: process.env.ROLLBAR_TOKEN,
  hardware: {
    setStorageItem: async (key: string, value: string | undefined) => {
      storage.set(key, value);
    },
    getStorageItem: async (key: string): Promise<string | undefined> => {
      return storage.get(key);
    },
    clearStorage: async () => {
      storage.clear();
    },
  },
});
