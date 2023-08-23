import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import NodeRSA from "node-rsa";
import { EnvironmentVariables } from "../../src/types";
import { logger } from "../../src/util/logger";
import { newDatabase } from "./newDatabase";

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
  SUPPRESS_LOGGING: "true",
  SERVER_RSA_PRIVATE_KEY_BASE64: undefined,
  SERVER_EDDSA_PRIVATE_KEY: undefined
});

export const pcdpassTestingEnv: EnvironmentVariables = Object.freeze({
  ...zuzaluTestingEnv,
  IS_ZUZALU: "false",
  PRETIX_ORG_URL: undefined,
  PRETIX_TOKEN: undefined,
  PRETIX_VISITOR_EVENT_ID: undefined,
  PRETIX_ZU_EVENT_ID: undefined,
  SERVER_RSA_PRIVATE_KEY_BASE64: Buffer.from(
    new NodeRSA({ b: 2048 }).exportKey("private")
  ).toString("base64"),
  SERVER_EDDSA_PRIVATE_KEY: newEdDSAPrivateKey()
});

export async function overrideEnvironment(
  envOverrides?: Partial<EnvironmentVariables>
): Promise<void> {
  if (envOverrides?.SUPPRESS_LOGGING) {
    process.env.SUPPRESS_LOGGING = envOverrides.SUPPRESS_LOGGING;
  }

  logger("[INIT] overriding environment variables");
  for (const entry of Object.entries(envOverrides ?? {})) {
    process.env[entry[0]] = entry[1];
    logger(
      "[INIT] overriding environment variable",
      entry[0],
      "with",
      entry[1]
    );
    if (entry[1] === undefined) {
      delete process.env[entry[0]];
    }
  }

  await newDatabase();

  logger("[INIT] finished overriding environment variables");
}
