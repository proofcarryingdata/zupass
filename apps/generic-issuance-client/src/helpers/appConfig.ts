export interface AppConfig {
  // token that allows the client to upload errors to rollbar
  rollbarToken: string | undefined;
  // the environment to which the client uploads errors in rollbar
  rollbarEnvName: string | undefined;
}

export const appConfig: AppConfig = {
  rollbarEnvName: process.env.ROLLBAR_ENV_NAME,
  rollbarToken: process.env.ROLLBAR_TOKEN
};
