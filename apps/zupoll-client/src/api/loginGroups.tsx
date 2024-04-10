import _ from "lodash";
import { LoginCategory } from "../../types";
import { LoginGroup } from "../app/login/LoginWidget";
import { LoginConfig } from "../types";
import {
  DEVCONNECT_ORGANIZER_CONFIG,
  DEVCONNECT_USER_CONFIG,
  EDGE_CITY_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  ETH_LATAM_ATTENDEE_CONFIG,
  ETH_LATAM_ORGANIZER_CONFIG,
  ZUZALU_ORGANIZER_LOGIN_CONFIG,
  ZUZALU_PARTICIPANT_LOGIN_CONFIG
} from "./legacyLoginConfigs";

export const LEGACY_LOGIN_CONFIGS: LoginConfig[] = [
  ETH_LATAM_ATTENDEE_CONFIG,
  ETH_LATAM_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  EDGE_CITY_ORGANIZER_CONFIG,
  ZUZALU_PARTICIPANT_LOGIN_CONFIG,
  ZUZALU_ORGANIZER_LOGIN_CONFIG,
  DEVCONNECT_USER_CONFIG,
  DEVCONNECT_ORGANIZER_CONFIG
];

function groupLoginConfigs(configs: LoginConfig[]): LoginGroup[] {
  const rawGroups = Object.entries(
    _.groupBy(configs, (r) => r.configCategoryId)
  ) as [LoginCategory, LoginConfig[]][];

  return rawGroups.map(
    ([groupId, configs]) => ({ groupId, configs }) satisfies LoginGroup
  );
}

export const LOGIN_GROUPS = groupLoginConfigs(LEGACY_LOGIN_CONFIGS);
