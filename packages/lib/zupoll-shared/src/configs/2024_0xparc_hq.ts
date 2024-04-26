import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { LoginConfig } from "../types";

export function make0xPARChq(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const PARC_HQ_CONFIG_ID = "0xPARC HQ";
  const PARC_HQ_CONFIG_NAME = "0xPARC HQ Member";
  const PARC_HQ_RESIDENTS_NAME = "All Polls";
  const PARC_HQ_RESIDENTS_DESCRIPTION = "Polls created by someone at 0xPARC";
  const PARC_HQ_ORGANIZER_NAME = "Dev Polls";
  const PARC_HQ_ORGANIZER_DESCRIPTION = "Polls created by the devs of Zupoll";
  const PARC_HQ_DESCRIPTION = "0xPARC Polls - be excellent to each other";
  const PARC_HQ_CONFIG_PIPELINE_ID = "2ee2002c-a14f-4261-b23e-a6b0bcd82b9c";
  const PARC_HQ_CONFIG_RESIDENT_SEMA_GROUP_ID =
    "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
  const PARC_HQ_CONFIG_ORGANIZER_SEMA_GROUP_ID =
    "01097f38-8bb8-44d2-a775-75f9221b0c50";
  const PARC_HQ_YEAR = 2024;
  const PARC_HQ_MONTH = 1;
  const PARC_HQ_DAY = 1;
  const PARC_HQ_CONFIG = makePodboxLoginConfigs(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    PARC_HQ_CONFIG_ID,
    PARC_HQ_DESCRIPTION,
    PARC_HQ_CONFIG_NAME,
    PARC_HQ_RESIDENTS_NAME,
    PARC_HQ_RESIDENTS_DESCRIPTION,
    PARC_HQ_ORGANIZER_NAME,
    PARC_HQ_ORGANIZER_DESCRIPTION,
    PARC_HQ_CONFIG_PIPELINE_ID,
    PARC_HQ_CONFIG_RESIDENT_SEMA_GROUP_ID,
    PARC_HQ_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    PARC_HQ_YEAR,
    PARC_HQ_MONTH,
    PARC_HQ_DAY
  );
  return PARC_HQ_CONFIG;
}
