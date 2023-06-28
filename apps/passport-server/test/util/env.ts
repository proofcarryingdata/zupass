import { EnvironmentVariables } from "../../src/types";

export const zuzaluTestingEnv: EnvironmentVariables = Object.freeze({
  NODE_ENV: "production",
  IS_ZUZALU: "true",
  MAILGUN_API_KEY: undefined,
  DATABASE_USERNAME: "admin",
  DATABASE_PASSWORD: "password",
  DATABASE_HOST: "localhost",
  DATABASE_DB_NAME: "postgres",
  DATABASE_SSL: "false",
  BYPASS_EMAIL_REGISTRATION: "false",
  HONEYCOMB_API_KEY: undefined,
  ROLLBAR_TOKEN: undefined,
  PRETIX_ORG_URL: "pretix_org_url",
  PRETIX_TOKEN: "pretix_token",
  PRETIX_VISITOR_EVENT_ID: "visitor_event_id",
  PRETIX_ZU_EVENT_ID: "zu_event_id",
});

export const pcdpassTestingEnv: EnvironmentVariables = Object.freeze({
  ...zuzaluTestingEnv,
  IS_ZUZALU: "false",
  PRETIX_ORG_URL: undefined,
  PRETIX_TOKEN: undefined,
  PRETIX_VISITOR_EVENT_ID: undefined,
  PRETIX_ZU_EVENT_ID: undefined,
});

export function overrideEnvironment(
  envOverrides?: Partial<EnvironmentVariables>
) {
  console.log("[INIT] overriding environment variables");
  for (const entry of Object.entries(envOverrides ?? {})) {
    process.env[entry[0]] = entry[1];
    console.log(
      "[INIT] overriding environment variable",
      entry[0],
      "with",
      entry[1]
    );
    if (entry[1] === undefined) {
      delete process.env[entry[0]];
    }
  }
  console.log("[INIT] finished overriding environment variables");
}
