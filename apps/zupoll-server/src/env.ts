export const IS_PROD: boolean = process.env.NODE_ENV === "production";

export const ZUPASS_CLIENT_URL: string = warnIfEnvMissing(
  process.env.ZUPASS_CLIENT_URL,
  "ZUPASS_CLIENT_URL",
  "http://localhost:3000"
);
export const ZUPASS_SERVER_URL: string = warnIfEnvMissing(
  process.env.ZUPASS_SERVER_URL,
  "ZUPASS_SERVER_URL",
  "http://localhost:3002"
);
export const ZUPOLL_CLIENT_URL: string = warnIfEnvMissing(
  process.env.ZUPOLL_CLIENT_URL,
  "ZUPOLL_CLIENT_URL",
  "http://localhost:3012"
);
export const ZUPOLL_SERVER_URL: string = warnIfEnvMissing(
  process.env.ZUPOLL_SERVER_URL,
  "ZUPOLL_SERVER_URL",
  "http://localhost:3011"
);
export const BOT_ZUPOLL_LINK: string | undefined = warnIfEnvMissing(
  process.env.BOT_ZUPOLL_LINK,
  "BOT_ZUPOLL_LINK",
  ""
);
export const EDGE_CITY_PIPELINE_URL: string = warnIfEnvMissing(
  process.env.EDGE_CITY_PIPELINE_URL,
  "EDGE_CITY_PIPELINE_URL",
  "http://localhost:3002/generic-issuance/api/semaphore/9ed5bcf2-3fda-4959-baff-b4085efe6ff4"
);
export const EDGE_CITY_RESIDENTS_GROUP_ID: string = warnIfEnvMissing(
  process.env.EDGE_CITY_RESIDENTS_GROUP_ID,
  "EDGE_CITY_RESIDENTS_GROUP_ID",
  "68ad1cdd-eb7d-44a6-8fe8-de5d1026e44c"
);
export const EDGE_CITY_ORGANIZERS_GROUP_ID: string = warnIfEnvMissing(
  process.env.EDGE_CITY_ORGANIZERS_GROUP_ID,
  "EDGE_CITY_ORGANIZERS_GROUP_ID",
  "898acf2e-2252-443e-a6db-bd4c520b664c"
);
export const ETH_LATAM_PIPELINE_URL: string = warnIfEnvMissing(
  process.env.ETH_LATAM_PIPELINE_URL,
  "ETH_LATAM_PIPELINE_URL",
  "http://localhost:3002/generic-issuance/api/semaphore/c5a7e7c7-a795-41bf-adcc-1f8bb433309b"
);
export const ETH_LATAM_RESIDENTS_GROUP_ID: string = warnIfEnvMissing(
  process.env.ETH_LATAM_RESIDENTS_GROUP_ID,
  "ETH_LATAM_RESIDENTS_GROUP_ID",
  "157d07ad-3e69-4287-8128-f577485b5f26"
);
export const ETH_LATAM_ORGANIZERS_GROUP_ID: string = warnIfEnvMissing(
  process.env.ETH_LATAM_ORGANIZERS_GROUP_ID,
  "ETH_LATAM_ORGANIZERS_GROUP_ID",
  "217d77d7-0e89-4c39-9d0d-819a575f3f90"
);

export const ROLLBAR_TOKEN = process.env.ROLLBAR_TOKEN;
export const ROLLBAR_ENV_NAME = process.env.ROLLBAR_ENV_NAME;

export function warnIfEnvMissing(
  value: string | undefined,
  name: string,
  defaultValue: string
): string {
  if (value === undefined) {
    console.warn(
      `Environment variable ${name} is not set. Using default value '${defaultValue}'`
    );
    return defaultValue;
  }
  return value;
}
