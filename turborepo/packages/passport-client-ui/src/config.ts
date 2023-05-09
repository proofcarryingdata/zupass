export interface Config {
  // Development mode lets you bypass email auth, etc.
  devMode: boolean;
  // The URL of the Passport server.
  passportServer: string;
  // The amount of time a zuzalu qr code proof is valid for
  maxProofAge: number;
  rollbarToken: string | undefined;

  localStorage: HWStorage;
  sessionStorage: HWStorage;
}

export interface HWStorage {
  setStorageItem: (key: string, value: string | undefined) => Promise<void>;
  getStorageItem: (key: string) => Promise<string | undefined>;
  clearStorage: () => Promise<void>;
}

export let config: Config;

export function setConfig(_config: Config) {
  config = _config;
}
