import chai from "chai";
import spies from "chai-spies";
import { IEmailAPI } from "../src/apis/emailAPI";
import { IPretixAPI } from "../src/apis/pretixAPI";
import { startApplication } from "../src/application";
import { APIs, PCDPass } from "../src/types";

chai.use(spies);

export interface TestingApplication {
  application: PCDPass;
  apis?: Partial<APIs>;
}

export function mockAPIs(): APIs {
  const emailAPI: IEmailAPI | null = {
    send: chai.spy.returns(Promise.resolve()),
  };

  const pretixAPI: IPretixAPI | null = null;

  return {
    emailAPI,
    pretixAPI,
  };
}

export async function startTestingApp(
  apiOverrides?: Partial<APIs>
): Promise<TestingApplication> {
  const apis = Object.assign(mockAPIs(), apiOverrides);

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
    apis
  );

  return { application, apis };
}
