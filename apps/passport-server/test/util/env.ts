import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd";
import NodeRSA from "node-rsa";
import { EnvironmentVariables } from "../../src/types";
import { logger } from "../../src/util/logger";
import { newDatabase } from "./newDatabase";

/**
 * We run tests using mocha's `--parallel` flag. Each test is thusly
 * executed in a separate process. In order for the tests to be able
 * to run in parallel, their webservers need to run on different ports.
 * This line here sets up each process with its own port.
 */
let TEST_PORT = Math.floor(
  Math.random() * 37891 * Math.abs(Math.sin(process.pid * 100)) + 20000
);

export function nextTestPort(): number {
  return ++TEST_PORT;
}

export const testingEnv: EnvironmentVariables = Object.freeze({
  SUPPRESS_LOGGING: "true",
  PORT: TEST_PORT,
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
  SERVER_RSA_PRIVATE_KEY_BASE64: Buffer.from(
    new NodeRSA({ b: 2048 }).exportKey("private")
  ).toString("base64"),
  SERVER_EDDSA_PRIVATE_KEY:
    "860d116de20c1cb5bd7cb68fdb786da9d9fb35bf96c336d6dcaef64733701f20",
  GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY: newEdDSAPrivateKey(),
  GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY: `["00f669040a1c31ff18b8e221b94ac36580da68a05c69c21298569e97e193ca45","2b2a9ae6ed7d5ca397637bbe7180849ac6e828171790644ed723abf2decb96c2"]`,
  STYTCH_PROJECT_ID: "stytch_project_id",
  STYTCH_SECRET: "stytch_url",
  GENERIC_ISSUANCE_CLIENT_URL: "http://localhost:3005",
  PASSPORT_CLIENT_URL: "http://localhost:3000",
  PASSPORT_SERVER_URL: `http://localhost:${TEST_PORT}`,
  PRETIX_SYNC_DISABLED: undefined,
  ACCOUNT_RESET_RATE_LIMIT_DISABLED: undefined,
  TICKET_ISSUANCE_CUTOFF_DATE: undefined,
  GENERIC_RATE_LIMIT_DISABLED: undefined,
  STYTCH_BYPASS: undefined,
  GENERIC_ISSUANCE_TEST_MODE: "true"
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

  logger("[INIT] overriding port");

  process.env.PORT = nextTestPort() + "";
  process.env.PASSPORT_SERVER_URL = `http://localhost:${process.env.PORT}`;

  logger("[INIT] finished overriding environment variables");
}
