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
  const PARC_GROUP_URL = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    PARC_HQ_CONFIG_PIPELINE_ID,
    PARC_HQ_CONFIG_SEMA_GROUP_ID
  );

  const PARC_HQ_CONFIG: LoginConfig = {
    configCategoryId: PARC_HQ_CONFIG_ID,
    groupId: PARC_HQ_CONFIG_SEMA_GROUP_ID,
    groupUrl: PARC_GROUP_URL,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    name: PARC_HQ_CONFIG_NAME,
    description: PARC_HQ_DESCRIPTION,
    buttonName: PARC_HQ_CONFIG_NAME,
    canCreateBallotTypes: [BallotType.PODBOX],
    ballotConfigs: [
      {
        voterGroupId: PARC_HQ_CONFIG_SEMA_GROUP_ID,
        voterGroupUrl: PARC_GROUP_URL,
        creatorGroupId: PARC_HQ_CONFIG_SEMA_GROUP_ID,
        creatorGroupUrl: PARC_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX,
        latestGroupHashUrl: urljoin(PARC_GROUP_URL, "latest-root"),
        makeHistoricalGroupUrl: (hash) => urljoin(PARC_GROUP_URL, hash)
      }
    ]
  };

  return [PARC_HQ_CONFIG];
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
