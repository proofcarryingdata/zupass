import { BallotConfig, BallotType } from "@pcd/zupoll-shared";
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
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const ADVISORY_VOTE_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.ZuzaluParticipants,
  voterGroupUrl: ZUZALU_PARTICIPANTS_GROUP_URL,
  creatorGroupId: SemaphoreGroups.ZuzaluOrganizers,
  creatorGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ADVISORYVOTE,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const ORGANIZER_ONLY_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.ZuzaluOrganizers,
  voterGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  creatorGroupId: SemaphoreGroups.ZuzaluOrganizers,
  creatorGroupUrl: ZUZALU_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ORGANIZERONLY,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const DEVCONNECT_ATTENDEE_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.DevconnectAttendees,
  voterGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  creatorGroupId: SemaphoreGroups.DevconnectAttendees,
  creatorGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.DEVCONNECT_STRAW,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const DEVCONNECT_ORGANIZER_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: SemaphoreGroups.DevconnectAttendees,
  voterGroupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  creatorGroupId: SemaphoreGroups.DevconnectOrganizers,
  creatorGroupUrl: DEVCONNECT_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.DEVCONNECT_ORGANIZER,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const EDGE_CITY_RESIDENT_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  voterGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  creatorGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  creatorGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.EDGE_CITY_RESIDENT,
  latestGroupHashUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/latest-root",
  makeHistoricalGroupUrl: (hash) =>
    EDGE_CITY_RESIDENT_CONFIG.groupUrl + "/" + hash,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const EDGE_CITY_ORGANIZER_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: EDGE_CITY_RESIDENT_CONFIG.groupId,
  voterGroupUrl: EDGE_CITY_RESIDENT_CONFIG.groupUrl,
  creatorGroupId: EDGE_CITY_ORGANIZER_CONFIG.groupId,
  creatorGroupUrl: EDGE_CITY_ORGANIZER_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.EDGE_CITY_ORGANIZER,
  latestGroupHashUrl: EDGE_CITY_ORGANIZER_CONFIG.groupUrl + "/latest-root",
  makeHistoricalGroupUrl: (hash) =>
    EDGE_CITY_ORGANIZER_CONFIG.groupUrl + "/" + hash,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const ETH_LATAM_STRAWPOLL_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: ETH_LATAM_ATTENDEE_CONFIG.groupId,
  voterGroupUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl,
  creatorGroupId: ETH_LATAM_ATTENDEE_CONFIG.groupId,
  creatorGroupUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ETH_LATAM_STRAWPOLL,
  latestGroupHashUrl: ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/latest-root",
  makeHistoricalGroupUrl: (hash) =>
    ETH_LATAM_ATTENDEE_CONFIG.groupUrl + "/" + hash,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
};

export const ETH_LATAM_FEEDBACK_BALLOT_CONFIG: BallotConfig = {
  voterGroupId: ETH_LATAM_ORGANIZER_CONFIG.groupId,
  voterGroupUrl: ETH_LATAM_ORGANIZER_CONFIG.groupUrl,
  creatorGroupId: ETH_LATAM_ORGANIZER_CONFIG.groupId,
  creatorGroupUrl: ETH_LATAM_ORGANIZER_CONFIG.groupUrl,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_CLIENT_URL,
  ballotType: BallotType.ETH_LATAM_FEEDBACK,
  latestGroupHashUrl: ETH_LATAM_ORGANIZER_CONFIG.groupUrl + "/latest-root",
  makeHistoricalGroupUrl: (hash) =>
    ETH_LATAM_ORGANIZER_CONFIG.groupUrl + "/" + hash,
  allowedViewerGroupIds: [],
  allowedVoterGroupIds: [],
  allowedViewerRealmIds: [],
  allowedVoterRealmIds: [],
  isPublic: false
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
