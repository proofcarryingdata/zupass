import urljoin from "url-join";
import { BallotType, LoginConfig } from "./types";

export function getPodboxConfigs(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const PARC_HQ_CONFIG_ID = "0xPARC HQ";
  const PARC_HQ_CONFIG_NAME = "0xPARC HQ";
  const PARC_HQ_CONFIG_PIPELINE_ID = "a8e4dc18-570b-4094-808b-6e699ed08254";
  const PARC_HQ_CONFIG_SEMA_GROUP_ID = "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
  const PARC_GROUP_URL = makePodboxGroupUrl(
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
    buttonName: PARC_HQ_CONFIG_NAME,
    canCreateBallotTypes: [BallotType.PODBOX],
    ballotConfigs: [
      {
        voterGroupId: "asdf",
        voterGroupUrl: PARC_GROUP_URL,
        creatorGroupId: "asdf",
        creatorGroupUrl: PARC_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX
      }
    ]
  };

  return [PARC_HQ_CONFIG];
}

export function makePodboxGroupUrl(
  pipelineId: string,
  groupId: string
): string {
  return urljoin(
    "http://localhost:3002/generic-issuance/api/semaphore/",
    pipelineId,
    groupId
  );
}
