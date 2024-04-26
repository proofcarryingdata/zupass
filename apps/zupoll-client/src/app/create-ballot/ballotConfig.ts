import { BallotConfig, BallotType } from "@pcd/zupoll-shared";
import urljoin from "url-join";
import {
  EDGE_CITY_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  ETH_LATAM_ATTENDEE_CONFIG,
  ETH_LATAM_ORGANIZER_CONFIG
} from "../../api/legacyLoginConfigs";
import {
  DEVCONNECT_ADMINS_GROUP_URL,
  DEVCONNECT_ATTENDEES_GROUP_URL,
  SemaphoreGroups,
  ZUPASS_CLIENT_URL,
  ZUPASS_SERVER_URL,
  ZUZALU_ADMINS_GROUP_URL,
  ZUZALU_PARTICIPANTS_GROUP_URL
} from "../../env";

export const STRAWPOLL_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.ZuzaluParticipants,
  voterGroupUrl: ZUZALU_PARTICIPANTS_GROUP_URL,
  creatorGroupId: SemaphoreGroups.ZuzaluParticipants,
  creatorGroupUrl: ZUZALU_PARTICIPANTS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.STRAWPOLL,
  isPublic: false,
  makeHistoricVoterGroupUrl: (hash) =>
    urljoin(
      ZUPASS_SERVER_URL,
      "semaphore/historic",
      STRAWPOLL_BALLOT_CONFIG.voterGroupId,
      hash
    ),
  name: "STRAWPOLL_BALLOT_CONFIG"
};

export const ADVISORY_VOTE_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.ZuzaluParticipants,
  voterGroupUrl: ZUZALU_PARTICIPANTS_GROUP_URL,
  creatorGroupId: SemaphoreGroups.ZuzaluOrganizers,
  creatorGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ADVISORYVOTE,
  isPublic: false,
  makeHistoricVoterGroupUrl: (hash) =>
    urljoin(
      ZUPASS_SERVER_URL,
      "semaphore/historic",
      ADVISORY_VOTE_BALLOT_CONFIG.voterGroupId,
      hash
    ),
  name: "ADVISORY_VOTE_BALLOT_CONFIG"
};

export const ORGANIZER_ONLY_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.ZuzaluOrganizers,
  voterGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  creatorGroupId: SemaphoreGroups.ZuzaluOrganizers,
  creatorGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ORGANIZERONLY,
  isPublic: false,
  makeHistoricVoterGroupUrl: (hash) =>
    urljoin(
      ZUPASS_SERVER_URL,
      "semaphore/historic",
      ORGANIZER_ONLY_BALLOT_CONFIG.voterGroupId,
      hash
    ),
  name: "ORGANIZER_ONLY_BALLOT_CONFIG"
};

export const DEVCONNECT_ATTENDEE_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.DevconnectAttendees,
  voterGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  creatorGroupId: SemaphoreGroups.DevconnectAttendees,
  creatorGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.DEVCONNECT_STRAW,
  isPublic: false,
  makeHistoricVoterGroupUrl: (hash) =>
    urljoin(
      ZUPASS_SERVER_URL,
      "semaphore/historic",
      DEVCONNECT_ATTENDEE_BALLOT_CONFIG.voterGroupId,
      hash
    ),
  name: "DEVCONNECT_ATTENDEE_BALLOT_CONFIG"
};

export const DEVCONNECT_ORGANIZER_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.DevconnectAttendees,
  voterGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  creatorGroupId: SemaphoreGroups.DevconnectOrganizers,
  creatorGroupUrl: DEVCONNECT_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.DEVCONNECT_ORGANIZER,
  isPublic: false,
  makeHistoricVoterGroupUrl: (hash) =>
    urljoin(
      ZUPASS_SERVER_URL,
      "semaphore/historic",
      DEVCONNECT_ORGANIZER_BALLOT_CONFIG.voterGroupId,
      hash
    ),
  name: "DEVCONNECT_ORGANIZER_BALLOT_CONFIG"
};

export const EDGE_CITY_RESIDENT_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  voterGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  creatorGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  creatorGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.EDGE_CITY_RESIDENT,
  latestVoterGroupHashUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/latest-root",
  makeHistoricVoterGroupUrl: (hash) =>
    EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/" + hash,
  isPublic: false,
  name: "EDGE_CITY_RESIDENT_BALLOT_CONFIG"
};

export const EDGE_CITY_ORGANIZER_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  voterGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  creatorGroupId: EDGE_CITY_ORGANIZER_CONFIG.groupId,
  creatorGroupUrl: EDGE_CITY_ORGANIZER_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.EDGE_CITY_ORGANIZER,
  latestVoterGroupHashUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/latest-root",
  makeHistoricVoterGroupUrl: (hash) =>
    EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/" + hash,
  isPublic: false,
  name: "EDGE_CITY_ORGANIZER_BALLOT_CONFIG"
};

export const ETH_LATAM_STRAWPOLL_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: ETH_LATAM_ATTENDEE_CONFIG.groupId,
  voterGroupUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl,
  creatorGroupId: ETH_LATAM_ATTENDEE_CONFIG.groupId,
  creatorGroupUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ETH_LATAM_STRAWPOLL,
  latestVoterGroupHashUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/latest-root",
  makeHistoricVoterGroupUrl: (hash) =>
    ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/" + hash,
  isPublic: false,
  name: "ETH_LATAM_STRAWPOLL_BALLOT_CONFIG"
};

export const ETH_LATAM_FEEDBACK_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: ETH_LATAM_ORGANIZER_CONFIG.groupId,
  voterGroupUrl: ETH_LATAM_ORGANIZER_CONFIG.groupUrl,
  creatorGroupId: ETH_LATAM_ORGANIZER_CONFIG.groupId,
  creatorGroupUrl: ETH_LATAM_ORGANIZER_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ETH_LATAM_FEEDBACK,
  latestVoterGroupHashUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/latest-root",
  makeHistoricVoterGroupUrl: (hash) =>
    ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/" + hash,
  isPublic: false,
  name: "ETH_LATAM_FEEDBACK_BALLOT_CONFIG"
};

export const BALLOT_CONFIGS = {
  [BallotType.ADVISORYVOTE]: ADVISORY_VOTE_BALLOT_CONFIG,
  [BallotType.ORGANIZERONLY]: ORGANIZER_ONLY_BALLOT_CONFIG,
  [BallotType.STRAWPOLL]: STRAWPOLL_BALLOT_CONFIG,
  [BallotType.DEVCONNECT_STRAW]: DEVCONNECT_ATTENDEE_BALLOT_CONFIG,
  [BallotType.DEVCONNECT_ORGANIZER]: DEVCONNECT_ORGANIZER_BALLOT_CONFIG,
  [BallotType.EDGE_CITY_RESIDENT]: EDGE_CITY_RESIDENT_BALLOT_CONFIG,
  [BallotType.EDGE_CITY_ORGANIZER]: EDGE_CITY_ORGANIZER_BALLOT_CONFIG,
  [BallotType.ETH_LATAM_STRAWPOLL]: ETH_LATAM_STRAWPOLL_BALLOT_CONFIG,
  [BallotType.ETH_LATAM_FEEDBACK]: ETH_LATAM_FEEDBACK_BALLOT_CONFIG
};
