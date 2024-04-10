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

export const ZUPASS_CLIENT_URL = process.env.NEXT_PUBLIC_ZUPASS_URL ?? "";
export const ZUPASS_SERVER_URL =
  process.env.NEXT_PUBLIC_ZUPASS_SERVER_URL ?? "";
export const ZUPOLL_SERVER_URL =
  process.env.NEXT_PUBLIC_ZUPOLL_SERVER_URL ?? "";

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

export const EDGE_CITY_PIPELINE_URL = `${process.env.NEXT_PUBLIC_EDGE_CITY_PIPELINE_URL}`;
export const EDGE_CITY_RESIDENTS_GROUP_ID = `${process.env.NEXT_PUBLIC_EDGE_CITY_RESIDENTS_GROUP_ID}`;
export const EDGE_CITY_RESIDENTS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_RESIDENTS_GROUP_ID
);
export const EDGE_CITY_ORGANIZERS_GROUP_ID = `${process.env.NEXT_PUBLIC_EDGE_CITY_ORGANIZERS_GROUP_ID}`;
export const EDGE_CITY_ORGANIZERS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_ORGANIZERS_GROUP_ID
);

export const ETH_LATAM_PIPELINE_URL = `${process.env.NEXT_PUBLIC_ETH_LATAM_PIPELINE_URL}`;
export const ETH_LATAM_ATTENDEES_GROUP_ID = `${process.env.NEXT_PUBLIC_ETH_LATAM_ATTENDEES_GROUP_ID}`;
export const ETH_LATAM_ATTENDEES_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_ATTENDEES_GROUP_ID
);
export const ETH_LATAM_ORGANIZERS_GROUP_ID = `${process.env.NEXT_PUBLIC_ETH_LATAM_ORGANIZERS_GROUP_ID}`;
export const ETH_LATAM_ORGANIZERS_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_ORGANIZERS_GROUP_ID
);
