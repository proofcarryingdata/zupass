export interface Config {
  // Development mode lets you bypass email auth, etc.
  devMode: boolean;
  // The URL of the Passport server.
  passportServer: string;
  // The amount of time a zuzalu qr code proof is valid for
  maxProofAge: number;
  rollbarToken: string | undefined;
}

export let config: Config;

export function setConfig(_config: Config) {
  config = _config;
}
