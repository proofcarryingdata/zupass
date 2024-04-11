import {
  LoginCategory,
  LoginConfig,
  getPodboxConfigs
} from "@pcd/zupoll-shared";
import _ from "lodash";
import { ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL } from "../env";
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
  ETH_LATAM_ORGANIZER_CONFIG,
  ETH_LATAM_ATTENDEE_CONFIG,
  EDGE_CITY_ORGANIZER_CONFIG,
  EDGE_CITY_RESIDENT_CONFIG,
  ZUZALU_ORGANIZER_LOGIN_CONFIG,
  ZUZALU_PARTICIPANT_LOGIN_CONFIG,
  DEVCONNECT_ORGANIZER_CONFIG,
  DEVCONNECT_USER_CONFIG
];

export const PODBOX_LOGIN_CONFIGS: LoginConfig[] = getPodboxConfigs(
  ZUPASS_CLIENT_URL,
  ZUPASS_SERVER_URL
);

export const LOGIN_GROUPS: LoginGroup[] = groupLoginConfigs([
  ...LEGACY_LOGIN_CONFIGS,
  ...PODBOX_LOGIN_CONFIGS
]);

function groupLoginConfigs(configs: LoginConfig[]): LoginGroup[] {
  const rawGroups = Object.entries(
    _.groupBy(configs, (r) => r.configCategoryId)
  ) as [LoginCategory, LoginConfig[]][];

  return rawGroups.map(
    ([groupId, configs]) =>
      ({ category: groupId, configs }) satisfies LoginGroup
  );
}

export function getConfigGroup(
  name: LoginCategory | undefined
): LoginGroup | undefined {
  return LOGIN_GROUPS.find((c) => c.category === name);
}
export interface LoginGroup {
  category: LoginCategory;
  configs: LoginConfig[];
}
