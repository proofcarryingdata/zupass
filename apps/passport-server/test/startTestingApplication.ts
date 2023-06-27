import { startApplication } from "../src/application";
import { PCDPass } from "../src/types";

export async function startTestingApp(): Promise<PCDPass> {
  const application = await startApplication(
    {
      IS_ZUZALU: "false",
      MAILGIN_API_KEY: undefined,
      DATABASE_USERNAME: "admin",
      DATABASE_PASSWORD: "password",
      DATABASE_HOST: "localhost",
      DATABASE_DB_NAME: "postgres",
      DATABASE_SSL: "false",
      BYPASS_EMAIL_REGISTRATION: "false",
      NODE_ENV: "production",
      HONEYCOMB_API_KEY: undefined,
      ROLLBAR_TOKEN: undefined,
    },
    {}
  );

  return application;
}
