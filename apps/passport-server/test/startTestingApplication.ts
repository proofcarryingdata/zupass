import chai from "chai";
import spies from "chai-spies";
import { IEmailAPI } from "../src/apis/emailAPI";
import { IPretixAPI } from "../src/apis/pretixAPI";
import { startApplication } from "../src/application";
import { APIs, PCDPass } from "../src/types";
import { getMockZuzaluPretixAPI } from "./pretix/mockPretixApi";

chai.use(spies);

export function mockAPIs(): APIs {
  const emailAPI: IEmailAPI | null = {
    send: chai.spy.returns(Promise.resolve()),
  };

  const pretixAPI: IPretixAPI | null = getMockZuzaluPretixAPI();

  return {
    emailAPI,
    pretixAPI,
  };
}

export async function startTestingApp(): Promise<PCDPass> {
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
      PRETIX_ORG_URL: "pretix_org_url",
      PRETIX_TOKEN: "pretix_token",
      PRETIX_VISITOR_EVENT_ID: "visitor_event_id",
      PRETIX_ZU_EVENT_ID: "zu_event_id",
    },
    mockAPIs
  );

  return application;
}
