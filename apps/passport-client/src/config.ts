interface Config {
  // Development mode lets you bypass email auth, etc.
  devMode: boolean;
  // The URL of the Passport server.
  passportServer: string;
  // The amount of time a zuzalu qr code proof is valid for
  maxProofAge: number;
}

export const config: Config = {
  devMode: process.env.NODE_ENV !== "production",
  passportServer: process.env.PASSPORT_SERVER_URL,
  maxProofAge: 1000 * 60 * 30,
};

console.log("Config: " + JSON.stringify(config));
