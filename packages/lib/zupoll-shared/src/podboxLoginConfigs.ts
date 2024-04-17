import urljoin from "url-join";
import { BallotType, LoginConfig } from "./types";

export function getPodboxConfigs(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const PARC_HQ_CONFIG_ID = "0xPARC HQ";
  const PARC_HQ_DESCRIPTION = "Ballots visible to 0xPARC Employees";
  const PARC_HQ_CONFIG_NAME = "0xPARC HQ";
  const PARC_HQ_CONFIG_PIPELINE_ID = "432a2e29-b884-4fd8-886b-04b42ad3242f";
  const PARC_HQ_CONFIG_SEMA_GROUP_ID = "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
  const PARC_HQ_CONFIG = makePodboxLoginConfig(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    PARC_HQ_CONFIG_ID,
    PARC_HQ_DESCRIPTION,
    PARC_HQ_CONFIG_NAME,
    PARC_HQ_CONFIG_PIPELINE_ID,
    PARC_HQ_CONFIG_SEMA_GROUP_ID
  );

  const ESMERALDA_HQ_CONFIG_ID = "Edge Esmeralda";
  const ESMERALDA_HQ_DESCRIPTION =
    "Ballots visible to Edge Esmaralda Residents";
  const ESMERALDA_HQ_CONFIG_NAME = "Edge Esmeralda";
  const ESMERALDA_HQ_CONFIG_PIPELINE_ID =
    "c00d3470-7ff8-4060-adc1-e9487d607d42";
  const ESMERALDA_HQ_CONFIG_SEMA_GROUP_ID =
    "02b5e490-0084-43b0-92d7-7ab74c5b0055";
  const ESMERALDA_HQ_CONFIG = makePodboxLoginConfig(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ESMERALDA_HQ_CONFIG_ID,
    ESMERALDA_HQ_DESCRIPTION,
    ESMERALDA_HQ_CONFIG_NAME,
    ESMERALDA_HQ_CONFIG_PIPELINE_ID,
    ESMERALDA_HQ_CONFIG_SEMA_GROUP_ID
  );

  return [PARC_HQ_CONFIG, ESMERALDA_HQ_CONFIG];
}

export function makePodboxLoginConfig(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string,
  id: string,
  description: string,
  name: string,
  pipelineId: string,
  semaphoreGroupId: string
): LoginConfig {
  const PARC_GROUP_URL = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    pipelineId,
    semaphoreGroupId
  );

  const PARC_HQ_CONFIG: LoginConfig = {
    configCategoryId: id,
    groupId: semaphoreGroupId,
    groupUrl: PARC_GROUP_URL,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    name: name,
    description: description,
    buttonName: name,
    canCreateBallotTypes: [BallotType.PODBOX],
    ballotConfigs: [
      {
        voterGroupId: semaphoreGroupId,
        voterGroupUrl: PARC_GROUP_URL,
        creatorGroupId: semaphoreGroupId,
        creatorGroupUrl: PARC_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX,
        latestGroupHashUrl: urljoin(PARC_GROUP_URL, "latest-root"),
        makeHistoricalGroupUrl: (hash) => urljoin(PARC_GROUP_URL, hash),
        allowedViewerGroupIds: [semaphoreGroupId],
        allowedVoterGroupIds: [semaphoreGroupId],
        allowedVoterRealmIds: [pipelineId],
        allowedViewerRealmIds: [pipelineId],
        isPublic: false
      }
    ]
  };

  return PARC_HQ_CONFIG;
}

export function makePodboxGroupUrl(
  ZUPASS_SERVER_URL: string,
  pipelineId: string,
  groupId: string
): string {
  return urljoin(
    ZUPASS_SERVER_URL,
    "generic-issuance/api/semaphore/",
    pipelineId,
    groupId
  );
}
