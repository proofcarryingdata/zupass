import { BallotType } from "./api/prismaTypes";

export type ZupollError = {
  /** Big title, should be under 40 chars */
  title: string;
  /** Useful explanation, avoid "Something went wrong." */
  message: string | React.ReactNode;
  /** Optional stacktrace. */
  stack?: string;
};

export enum PCDState {
  DEFAULT,
  AWAITING_PCDSTR,
  RECEIVED_PCDSTR
}

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

export interface BallotConfig {
  voterGroupId: string;
  voterGroupUrl: string;
  creatorGroupId: string;
  creatorGroupUrl: string;
  passportServerUrl: string;
  passportAppUrl: string;
  ballotType: BallotType;
  latestGroupHashUrl?: string;
  makeHistoricalGroupUrl?: (hash: string) => string;
}

export enum LegacyLoginCategoryName {
  EthLatAm = "ETH LATAM",
  Zuzalu = "Zuzalu",
  Zuconnect = "Zuconnect",
  Devconnect = "Devconnect",
  EdgeCityDenver = "Edge City Denver",
  Pipeline = "Pipeline"
}

export interface LoginCategoryGroups {
  category: LoginCategory;
}

export const CONFIG_GROUPS: LoginCategoryGroups[] = [
  { category: LegacyLoginCategoryName.EthLatAm },
  { category: LegacyLoginCategoryName.Zuzalu },
  { category: LegacyLoginCategoryName.Zuconnect },
  { category: LegacyLoginCategoryName.Devconnect },
  { category: LegacyLoginCategoryName.EdgeCityDenver },
  { category: LegacyLoginCategoryName.Pipeline }
];

export type LoginCategory = LegacyLoginCategoryName | string;

export interface LoginConfig {
  configCategoryId: LoginCategory;
  groupId: string;
  groupUrl: string;
  passportServerUrl: string;
  passportAppUrl: string;
  name: LoginConfigName;
  prompt: string;
}

export interface LoginState {
  token: string;
  config: LoginConfig;
}
