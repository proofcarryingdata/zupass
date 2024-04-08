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

export enum LoginConfigurationName {
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

export enum ConfigGroupName {
  EthLatAm = "ETH LATAM",
  Zuzalu = "Zuzalu",
  Zuconnect = "Zuconnect",
  Devconnect = "Devconnect",
  EdgeCityDenver = "Edge City Denver",
  Pipeline = "Pipeline"
}

export interface ConfigGroup {
  id: ConfigGroupName;
}

export const CONFIG_GROUPS: ConfigGroup[] = [
  { id: ConfigGroupName.EthLatAm },
  { id: ConfigGroupName.Zuzalu },
  { id: ConfigGroupName.Zuconnect },
  { id: ConfigGroupName.Devconnect },
  { id: ConfigGroupName.EdgeCityDenver },
  { id: ConfigGroupName.Pipeline }
];

export function getConfigGroup(
  name: ConfigGroupName | undefined
): ConfigGroup | undefined {
  return CONFIG_GROUPS.find((c) => c.id === name);
}

export interface LoginConfig {
  configGroupId: ConfigGroupName;
  groupId: string;
  groupUrl: string;
  passportServerUrl: string;
  passportAppUrl: string;
  name: LoginConfigurationName;
  prompt: string;
}

export interface LoginState {
  token: string;
  config: LoginConfig;
}
