import { makePodboxLoginConfigSingleGroup } from "../makePodboxLoginConfigs.js";
import { LoginConfig } from "../types.js";

export function makeZuvillageGeorgia(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ZUVILLAGE_GEORGIA_CONFIG_ID = "ZuVillage Georgia";
  const ZUVILLAGE_GEORGIA_CONFIG_NAME = "ZuVillage Georgia";
  const ZUVILLAGE_GEORGIA_RESIDENTS_NAME = "Polls";
  const ZUVILLAGE_GEORGIA_RESIDENTS_DESCRIPTION =
    "Polls created by ZuVillage Georgia pass holders";
  const ZUVILLAGE_GEORGIA_DESCRIPTION =
    "Polls created by ZuVillagers. Add to the discussion by creating a new Ballot!";
  const ZUVILLAGE_GEORGIA_CONFIG_PIPELINE_ID =
    "fca0ba48-125b-43a4-90ef-04f9fdede43d";
  const ZUVILLAGE_GEORGIA_CONFIG_SEMA_GROUP_ID =
    "7ce6f74a-1383-57be-a77a-d4fc04e02f45";
  const ZUVILLAGE_GEORGIA_YEAR = 2024;
  const ZUVILLAGE_GEORGIA_MONTH = 5;
  const ZUVILLAGE_GEORGIA_DAY = 1;
  // Only one config
  const ZUVILLAGE_GEORGIA_CONFIG = makePodboxLoginConfigSingleGroup(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ZUVILLAGE_GEORGIA_CONFIG_ID,
    ZUVILLAGE_GEORGIA_DESCRIPTION,
    ZUVILLAGE_GEORGIA_CONFIG_NAME,
    ZUVILLAGE_GEORGIA_RESIDENTS_NAME,
    ZUVILLAGE_GEORGIA_RESIDENTS_DESCRIPTION,
    ZUVILLAGE_GEORGIA_CONFIG_PIPELINE_ID,
    ZUVILLAGE_GEORGIA_CONFIG_SEMA_GROUP_ID,
    ZUVILLAGE_GEORGIA_YEAR,
    ZUVILLAGE_GEORGIA_MONTH,
    ZUVILLAGE_GEORGIA_DAY
  );

  return ZUVILLAGE_GEORGIA_CONFIG;
}
