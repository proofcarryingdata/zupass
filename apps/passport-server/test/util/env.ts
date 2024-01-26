import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import NodeRSA from "node-rsa";
import { EnvironmentVariables } from "../../src/types";
import { logger } from "../../src/util/logger";
import { newDatabase } from "./newDatabase";

export const testingEnv: EnvironmentVariables = Object.freeze({
  PORT: 47891,
  NODE_ENV: "production",
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
  SUPPRESS_LOGGING: "false",
  SERVER_RSA_PRIVATE_KEY_BASE64: Buffer.from(
    new NodeRSA({ b: 2048 }).exportKey("private")
  ).toString("base64"),
  SERVER_EDDSA_PRIVATE_KEY: newEdDSAPrivateKey(),
  PASSPORT_CLIENT_URL: "http://localhost:3000",
  PRETIX_SYNC_DISABLED: undefined,
  ACCOUNT_RESET_RATE_LIMIT_DISABLED: undefined,
  TICKET_ISSUANCE_CUTOFF_DATE: undefined,
  GENERIC_RATE_LIMIT_DISABLED: undefined
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
