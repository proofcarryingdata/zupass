/**
 * Enums, based on
 * https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
 *
 */
export const BallotType = {
  ADVISORYVOTE: "ADVISORYVOTE",
  STRAWPOLL: "STRAWPOLL",
  ORGANIZERONLY: "ORGANIZERONLY",
  DEVCONNECT_STRAW: "DEVCONNECT_STRAWPOLL",
  DEVCONNECT_ORGANIZER: "DEVCONNECT_FEEDBACK",
  EDGE_CITY_RESIDENT: "EDGE_CITY_STRAWPOLL",
  EDGE_CITY_ORGANIZER: "EDGE_CITY_FEEDBACK",
  ETH_LATAM_STRAWPOLL: "ETH_LATAM_STRAWPOLL",
  ETH_LATAM_FEEDBACK: "ETH_LATAM_FEEDBACK",
  PODBOX: "PODBOX"
};
export type BallotType = (typeof BallotType)[keyof typeof BallotType];

export type LoginConfigName = LegacyLoginConfigName | string;
export enum LegacyLoginConfigName {
  ZUZALU_PARTICIPANT = "ZUZALU_PARTICIPANT",
  ZUZALU_ORGANIZER = "ZUZALU_ORGANIZER",
  DEVCONNECT_PARTICIPANT = "DEVCONNECT_PARTICIPANT",
  DEVCONNECT_ORGANIZER = "DEVCONNECT_ORGANIZER",
  EDGE_CITY_RESIDENT = "EDGE_CITY_RESIDENT",
  EDGE_CITY_ORGANIZER = "EDGE_CITY_ORGANIZER",
  ETH_LATAM_ATTENDEE = "ETH_LATAM_ATTENDEE",
  ETH_LATAM_ORGANIZER = "ETH_LATAM_ORGANIZER"
}

export enum LegacyLoginCategoryName {
  EthLatAm = "ETH LATAM",
  Zuzalu = "Zuzalu / Zuconnect",
  Zuconnect = "Zuconnect",
  Devconnect = "Devconnect",
  EdgeCityDenver = "Edge City Denver",
  Pipeline = "Pipeline"
}

export type LoginCategory = LegacyLoginCategoryName | string;

export interface LoginConfig {
  year: number;
  month: number; // starting w/ 1
  day: number;
  configCategoryId: LoginCategory;
  groupId: string;
  groupUrl: string;
  passportServerUrl: string;
  passportAppUrl: string;
  name: LoginConfigName;
  description?: string;
  buttonName: string;
  canCreateBallotTypes: BallotType[];
  ballotConfigs?: BallotConfig[];
  pipelineId?: string;
}

export interface BallotConfig {
  name: string;
  voterGroupId: string;
  voterGroupUrl: string;
  creatorGroupId: string;
  creatorGroupUrl: string;
  passportServerUrl: string;
  passportAppUrl: string;
  ballotType: BallotType;
  latestVoterGroupHashUrl?: string;
  makeHistoricVoterGroupUrl?: (hash: string) => string;
  historicGroupPrefix?: string;

  description?: string;
  isDefault?: boolean;
  canCreate?: boolean;
}
