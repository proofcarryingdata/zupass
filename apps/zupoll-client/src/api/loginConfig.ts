import {
  DEVCONNECT_ADMINS_GROUP_URL,
  DEVCONNECT_ATTENDEES_GROUP_URL,
  EDGE_CITY_ORGANIZERS_GROUP_ID,
  EDGE_CITY_ORGANIZERS_GROUP_URL,
  EDGE_CITY_RESIDENTS_GROUP_ID,
  EDGE_CITY_RESIDENTS_GROUP_URL,
  ETH_LATAM_ATTENDEES_GROUP_ID,
  ETH_LATAM_ATTENDEES_GROUP_URL,
  ETH_LATAM_ORGANIZERS_GROUP_ID,
  ETH_LATAM_ORGANIZERS_GROUP_URL,
  SemaphoreGroups,
  ZUPASS_SERVER_URL,
  ZUPASS_URL,
  ZUZALU_ADMINS_GROUP_URL,
  ZUZALU_PARTICIPANTS_GROUP_URL
} from "../env";
import { ConfigGroupName, LoginConfig, LoginConfigurationName } from "../types";

export const ETH_LATAM_ATTENDEE_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.EthLatAm,
  groupId: ETH_LATAM_ATTENDEES_GROUP_ID,
  groupUrl: ETH_LATAM_ATTENDEES_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.ETH_LATAM_ATTENDEE,
  prompt: "ETH LatAm Attendee"
};

export const ETH_LATAM_ORGANIZER_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.EthLatAm,
  groupId: ETH_LATAM_ORGANIZERS_GROUP_ID,
  groupUrl: ETH_LATAM_ORGANIZERS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.ETH_LATAM_ORGANIZER,
  prompt: "ETH LatAm Organizer"
};

export const EDGE_CITY_RESIDENT_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.EdgeCityDenver,
  groupId: EDGE_CITY_RESIDENTS_GROUP_ID,
  groupUrl: EDGE_CITY_RESIDENTS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.EDGE_CITY_RESIDENT,
  prompt: "Edge City Resident"
};

export const EDGE_CITY_ORGANIZER_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.EdgeCityDenver,
  groupId: EDGE_CITY_ORGANIZERS_GROUP_ID,
  groupUrl: EDGE_CITY_ORGANIZERS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.EDGE_CITY_ORGANIZER,
  prompt: "Edge City Organizer"
};

export const ZUZALU_ORGANIZER_LOGIN_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.Zuzalu,
  groupId: SemaphoreGroups.ZuzaluOrganizers,
  groupUrl: ZUZALU_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.ZUZALU_ORGANIZER,
  prompt: "Zuzalu Organizer"
};

export const ZUZALU_PARTICIPANT_LOGIN_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.Zuzalu,
  groupId: SemaphoreGroups.ZuzaluParticipants,
  groupUrl: ZUZALU_PARTICIPANTS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.ZUZALU_PARTICIPANT,
  prompt: "ZuConnect Resident"
};

export const DEVCONNECT_USER_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.Devconnect,
  groupId: SemaphoreGroups.DevconnectAttendees,
  groupUrl: DEVCONNECT_ATTENDEES_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.DEVCONNECT_PARTICIPANT,
  prompt: "Devconnect Resident"
};

export const DEVCONNECT_ORGANIZER_CONFIG: LoginConfig = {
  configGroupId: ConfigGroupName.Devconnect,
  groupId: SemaphoreGroups.DevconnectOrganizers,
  groupUrl: DEVCONNECT_ADMINS_GROUP_URL,
  passportServerUrl: ZUPASS_SERVER_URL,
  passportAppUrl: ZUPASS_URL,
  name: LoginConfigurationName.DEVCONNECT_ORGANIZER,
  prompt: "Devconnect Organizer"
};
