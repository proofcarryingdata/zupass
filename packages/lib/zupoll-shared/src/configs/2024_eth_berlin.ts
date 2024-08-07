import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { LoginConfig } from "../types";

export function makeEthBerlin(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ETH_BERLIN_CONFIG_ID = "ETHBerlin";
  const ETH_BERLIN_CONFIG_NAME = "ETHBerlin";
  const ETH_BERLIN_RESIDENTS_NAME = "Attendee Polls";
  const ETH_BERLIN_RESIDENTS_DESCRIPTION =
    "Polls created by ETHBerlin Attendees";
  const ETH_BERLIN_ORGANIZER_NAME = "Staff Polls";
  const ETH_BERLIN_ORGANIZER_DESCRIPTION = "Polls created by ETHBerlin Staff";
  const ETH_BERLIN_DESCRIPTION =
    "Polls created by ETHBerlin Attendees. Add to the discussion by creating a new Ballot!";
  const ETH_BERLIN_CONFIG_PIPELINE_ID = "e0f80908-4c9e-4bdb-9804-c88e8f64f59b";
  const ETH_BERLIN_CONFIG_SEMA_GROUP_ID =
    "de1ab4fb-8bda-4388-abad-a8c80163cd00";
  const ETH_BERLIN_CONFIG_ORGANIZER_SEMA_GROUP_ID =
    "9ae5b79e-e095-42b2-9a95-c069a217a856";
  const ETH_BERLIN_YEAR = 2024;
  const ETH_BERLIN_MONTH = 4;
  const ETH_BERLIN_DAY = 1;
  const ETH_BERLIN_CONFIG = makePodboxLoginConfigs(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ETH_BERLIN_CONFIG_ID,
    ETH_BERLIN_DESCRIPTION,
    ETH_BERLIN_CONFIG_NAME,
    ETH_BERLIN_RESIDENTS_NAME,
    ETH_BERLIN_RESIDENTS_DESCRIPTION,
    ETH_BERLIN_ORGANIZER_NAME,
    ETH_BERLIN_ORGANIZER_DESCRIPTION,
    ETH_BERLIN_CONFIG_PIPELINE_ID,
    ETH_BERLIN_CONFIG_SEMA_GROUP_ID,
    ETH_BERLIN_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    ETH_BERLIN_YEAR,
    ETH_BERLIN_MONTH,
    ETH_BERLIN_DAY
  );

  return ETH_BERLIN_CONFIG;
}
