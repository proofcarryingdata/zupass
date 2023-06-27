import chai from "chai";
import spies from "chai-spies";
import { startApplication } from "../src/application";
import { APIs, PCDPass } from "../src/types";

chai.use(spies);

export interface TestingApplication {
  application: PCDPass;
  apis?: Partial<APIs>;
}

export async function startTestingApp(): Promise<TestingApplication> {
  const emailClient = { send: chai.spy.returns(Promise.resolve()) };

  const application = await startApplication(
    {
      IS_ZUZALU: "false",
      MAILGUN_API_KEY: undefined,
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
    {
      emailClient,
    }
  );

  return { application, apis: { emailClient } };
}
