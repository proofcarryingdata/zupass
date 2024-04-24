import { BallotType, LegacyLoginConfigName } from "@pcd/zupoll-shared";
import urljoin from "url-join";

export const enum SemaphoreGroups {
  ZuzaluParticipants = "1",
  ZuzaluResidents = "2",
  ZuzaluVisitors = "3",
  ZuzaluOrganizers = "4",
  Everyone = "5",
  DevconnectAttendees = "6",
  DevconnectOrganizers = "7"
}

export const BALLOT_TYPE_FROM_LOGIN_CONFIG: Record<
  LegacyLoginConfigName | string, // todo
  BallotType
> = {
  [LegacyLoginConfigName.ZUZALU_PARTICIPANT]: BallotType.STRAWPOLL,
  [LegacyLoginConfigName.ZUZALU_ORGANIZER]: BallotType.ADVISORYVOTE,
  [LegacyLoginConfigName.DEVCONNECT_ORGANIZER]: BallotType.DEVCONNECT_ORGANIZER,
  [LegacyLoginConfigName.DEVCONNECT_PARTICIPANT]: BallotType.DEVCONNECT_STRAW,
  [LegacyLoginConfigName.EDGE_CITY_RESIDENT]: BallotType.EDGE_CITY_RESIDENT,
  [LegacyLoginConfigName.EDGE_CITY_ORGANIZER]: BallotType.EDGE_CITY_ORGANIZER,
  [LegacyLoginConfigName.ETH_LATAM_ATTENDEE]: BallotType.ETH_LATAM_STRAWPOLL,
  [LegacyLoginConfigName.ETH_LATAM_ORGANIZER]: BallotType.ETH_LATAM_FEEDBACK
};

export const ZUPASS_CLIENT_URL = warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ZUPASS_URL,
  "NEXT_PUBLIC_ZUPASS_URL",
  "http://localhost:3000"
);
export const ZUPASS_SERVER_URL = warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ZUPASS_SERVER_URL,
  "NEXT_PUBLIC_ZUPASS_SERVER_URL",
  "http://localhost:3002"
);
export const ZUPOLL_SERVER_URL = warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ZUPOLL_SERVER_URL,
  "NEXT_PUBLIC_ZUPOLL_SERVER_URL",
  "http://localhost:3011"
);

export const ZUZALU_PARTICIPANTS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `semaphore/${SemaphoreGroups.ZuzaluParticipants}`
);
export const ZUZALU_ADMINS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `semaphore/${SemaphoreGroups.ZuzaluOrganizers}`
);
export const DEVCONNECT_ADMINS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `semaphore/${SemaphoreGroups.DevconnectOrganizers}`
);
export const DEVCONNECT_ATTENDEES_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `semaphore/${SemaphoreGroups.DevconnectAttendees}`
);

export const EDGE_CITY_PIPELINE_URL = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_EDGE_CITY_PIPELINE_URL,
  "NEXT_PUBLIC_EDGE_CITY_PIPELINE_URL",
  "http://localhost:3002/generic-issuance/api/semaphore/9ed5bcf2-3fda-4959-baff-b4085efe6ff4"
)}`;
export const EDGE_CITY_RESIDENTS_GROUP_ID = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_EDGE_CITY_RESIDENTS_GROUP_ID,
  "NEXT_PUBLIC_EDGE_CITY_RESIDENTS_GROUP_ID",
  "68ad1cdd-eb7d-44a6-8fe8-de5d1026e44c"
)}`;
export const EDGE_CITY_RESIDENTS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_RESIDENTS_GROUP_ID
);
export const EDGE_CITY_ORGANIZERS_GROUP_ID = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_EDGE_CITY_ORGANIZERS_GROUP_ID,
  "NEXT_PUBLIC_EDGE_CITY_ORGANIZERS_GROUP_ID",
  "898acf2e-2252-443e-a6db-bd4c520b664c"
)}`;
export const EDGE_CITY_ORGANIZERS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_ORGANIZERS_GROUP_ID
);
export const ETH_LATAM_PIPELINE_URL = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ETH_LATAM_PIPELINE_URL,
  "NEXT_PUBLIC_ETH_LATAM_PIPELINE_URL",
  "http://localhost:3002/generic-issuance/api/semaphore/c5a7e7c7-a795-41bf-adcc-1f8bb433309b"
)}`;
export const ETH_LATAM_ATTENDEES_GROUP_ID = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ETH_LATAM_ATTENDEES_GROUP_ID,
  "NEXT_PUBLIC_ETH_LATAM_ATTENDEES_GROUP_ID",
  "157d07ad-3e69-4287-8128-f577485b5f26"
)}`;
export const ETH_LATAM_ATTENDEES_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_ATTENDEES_GROUP_ID
);
export const ETH_LATAM_ORGANIZERS_GROUP_ID = `${warnIfEnvMissing(
  process.env.NEXT_PUBLIC_ETH_LATAM_ORGANIZERS_GROUP_ID,
  "NEXT_PUBLIC_ETH_LATAM_ORGANIZERS_GROUP_ID",
  "217d77d7-0e89-4c39-9d0d-819a575f3f90"
)}`;
export const ETH_LATAM_ORGANIZERS_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_ORGANIZERS_GROUP_ID
);

export const APP_CONFIG = {
  debugToolsEnabled:
    warnIfEnvMissing(
      process.env.NEXT_PUBLIC_DEBUG_TOOLS_ENABLED,
      "NEXT_PUBLIC_DEBUG_TOOLS_ENABLED",
      "false"
    ) === "true",
  rollbarAccessToken: process.env.NEXT_PUBLIC_ROLLBAR_ACCESS_TOKEN,
  rollbarEnvName: process.env.NEXT_PUBLIC_ROLLBAR_ENVIRONMENT_NAME
};

export function warnIfEnvMissing(
  value: string | undefined,
  name: string,
  defaultValue: string
): string {
  if (value === undefined) {
    console.warn(
      `Environment variable ${name} is not set. Using default value ${defaultValue}`
    );
    return defaultValue;
  }
  return value;
}
