interface Config {
  // The URL of the Passport server.
  passportServer: string;
}

export const config: Config = {
  passportServer: process.env.PASSPORT_SERVER,
};
