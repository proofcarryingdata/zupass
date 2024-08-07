import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { LoginConfig } from "../types";

export function makeEsmeralda(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ESMERALDA_CONFIG_ID = "Edge Esmeralda";
  const ESMERALDA_CONFIG_NAME = "Edge Esmeralda";
  const ESMERALDA_RESIDENTS_NAME = "Resident Polls";
  const ESMERALDA_RESIDENTS_DESCRIPTION =
    "Polls created by members of Edge Esmeralda";
  const ESMERALDA_ORGANIZER_NAME = "Staff Polls";
  const ESMERALDA_ORGANIZER_DESCRIPTION =
    "Polls created by Edge Esemeralda Staff";
  const ESMERALDA_DESCRIPTION =
    "Polls created at Edge Esmeralda. Add to the discussion by creating a new Ballot!";
  const ESMERALDA_CONFIG_PIPELINE_ID = "c00d3470-7ff8-4060-adc1-e9487d607d42";
  const ESMERALDA_CONFIG_SEMA_GROUP_ID = "02b5e490-0084-43b0-92d7-7ab74c5b0055";
  const ESMERALDA_CONFIG_ORGANIZER_SEMA_GROUP_ID =
    "b7d2a11b-dbf8-4969-a20e-70e657669b62";
  const ESEMERALDA_YEAR = 2024;
  const ESEMERALDA_MONTH = 4;
  const ESEMERALDA_DAY = 1;
  const ESMERALDA_CONFIG = makePodboxLoginConfigs(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ESMERALDA_CONFIG_ID,
    ESMERALDA_DESCRIPTION,
    ESMERALDA_CONFIG_NAME,
    ESMERALDA_RESIDENTS_NAME,
    ESMERALDA_RESIDENTS_DESCRIPTION,
    ESMERALDA_ORGANIZER_NAME,
    ESMERALDA_ORGANIZER_DESCRIPTION,
    ESMERALDA_CONFIG_PIPELINE_ID,
    ESMERALDA_CONFIG_SEMA_GROUP_ID,
    ESMERALDA_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    ESEMERALDA_YEAR,
    ESEMERALDA_MONTH,
    ESEMERALDA_DAY
  );
  return ESMERALDA_CONFIG;
}
