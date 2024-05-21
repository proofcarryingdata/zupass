import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { LoginConfig } from "../types";

export function makeEthPrague(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ETH_PRAGUE_CONFIG_ID = "ETHPrague";
  const ETH_PRAGUE_CONFIG_NAME = "ETHPrague";
  const ETH_PRAGUE_RESIDENTS_NAME = "Attendee Polls";
  const ETH_PRAGUE_RESIDENTS_DESCRIPTION =
    "Polls created by ETHPrague Attendees";
  const ETH_PRAGUE_ORGANIZER_NAME = "Staff Polls";
  const ETH_PRAGUE_ORGANIZER_DESCRIPTION = "Polls created by ETHPrague Staff";
  const ETH_PRAGUE_DESCRIPTION =
    "Polls created by ETHPrague Attendees. Add to the discussion by creating a new Ballot!";
  const ETH_PRAGUE_CONFIG_PIPELINE_ID = "24ac727d-bc2f-4727-bcfa-b15cf2f7037e";
  const ETH_PRAGUE_CONFIG_SEMA_GROUP_ID =
    "eaf2d5f1-4d8c-4342-92f7-d44e85178951";
  const ETH_PRAGUE_CONFIG_ORGANIZER_SEMA_GROUP_ID =
    "db1eac6e-81a8-411c-b22b-7007bf0a3773";
  const ETH_PRAGUE_YEAR = 2024;
  const ETH_PRAGUE_MONTH = 4;
  const ETH_PRAGUE_DAY = 1;
  const ETH_PRAGUE_CONFIG = makePodboxLoginConfigs(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ETH_PRAGUE_CONFIG_ID,
    ETH_PRAGUE_DESCRIPTION,
    ETH_PRAGUE_CONFIG_NAME,
    ETH_PRAGUE_RESIDENTS_NAME,
    ETH_PRAGUE_RESIDENTS_DESCRIPTION,
    ETH_PRAGUE_ORGANIZER_NAME,
    ETH_PRAGUE_ORGANIZER_DESCRIPTION,
    ETH_PRAGUE_CONFIG_PIPELINE_ID,
    ETH_PRAGUE_CONFIG_SEMA_GROUP_ID,
    ETH_PRAGUE_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    ETH_PRAGUE_YEAR,
    ETH_PRAGUE_MONTH,
    ETH_PRAGUE_DAY
  );
  return ETH_PRAGUE_CONFIG;
}
