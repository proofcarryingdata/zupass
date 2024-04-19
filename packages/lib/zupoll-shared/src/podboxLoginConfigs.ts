import urljoin from "url-join";
import { BallotType, LoginConfig } from "./types";

export function getPodboxConfigs(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  // https://podbox.dev/#/pipelines/2ee2002c-a14f-4261-b23e-a6b0bcd82b9c
  // https://staging.podbox.dev/#/pipelines/432a2e29-b884-4fd8-886b-04b42ad3242f
  // https://staging-ivan.podbox.dev/#/pipelines/432a2e29-b884-4fd8-886b-04b42ad3242f
  // http://localhost:3005/#/pipelines/432a2e29-b884-4fd8-886b-04b42ad3242f
  const PARC_HQ_CONFIG_ID = "0xPARC HQ";
  const PARC_HQ_CONFIG_NAME = "0xPARC HQ Member";
  const PARC_HQ_RESIDENTS_NAME = "Employee Ballots";
  const PARC_HQ_DESCRIPTION = "Ballots visible to 0xPARC Employees";
  const PARC_HQ_CONFIG_PIPELINE_ID = "432a2e29-b884-4fd8-886b-04b42ad3242f";
  const PARC_HQ_CONFIG_SEMA_GROUP_ID = "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
  const PARC_HQ_CONFIG = makePodboxLoginConfig(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    PARC_HQ_CONFIG_ID,
    PARC_HQ_DESCRIPTION,
    PARC_HQ_CONFIG_NAME,
    PARC_HQ_RESIDENTS_NAME,
    PARC_HQ_CONFIG_PIPELINE_ID,
    PARC_HQ_CONFIG_SEMA_GROUP_ID
  );

  // https://podbox.dev/#/pipelines/c00d3470-7ff8-4060-adc1-e9487d607d42
  // https://staging.podbox.dev/#/pipelines/f343cfdd-965b-4f0a-a429-7371576b323b
  // https://staging-ivan.podbox.dev/#/pipelines/f343cfdd-965b-4f0a-a429-7371576b323b
  // http://localhost:3005/#/pipelines/c00d3470-7ff8-4060-adc1-e9487d607d42
  const ESMERALDA_HQ_CONFIG_ID = "Edge Esmeralda Resident";
  const ESMERALDA_HQ_CONFIG_NAME = "Edge Esmeralda";
  const ESMERALDA_RESIDENTS_NAME = "Resident Ballots";
  const ESMERALDA_HQ_DESCRIPTION =
    "Ballots created by Edge Esmeralda residents. Add to the discussion by creating a new Ballot!";
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
    ESMERALDA_RESIDENTS_NAME,
    ESMERALDA_HQ_CONFIG_PIPELINE_ID,
    ESMERALDA_HQ_CONFIG_SEMA_GROUP_ID
  );

  // https://podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // https://staging.podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // https://staging-ivan.podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // http://localhost:3005/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // eth prague

  // https://podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // https://staging.podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // https://staging-ivan.podbox.dev/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  // http://localhost:3005/#/pipelines/24ac727d-bc2f-4727-bcfa-b15cf2f7037e
  const ETH_PRAGUE_HQ_CONFIG_ID = "Eth Prague";
  const ETH_PRAGUE_HQ_CONFIG_NAME = "Eth Prague";
  const ETH_PRAGUE_RESIDENTS_NAME = "Eth Prague Attendeess";
  const ETH_PRAGUE_HQ_DESCRIPTION =
    "Ballots created by Eth Prague Attendees. Add to the discussion by creating a new Ballot!";
  const ETH_PRAGUE_HQ_CONFIG_PIPELINE_ID =
    "24ac727d-bc2f-4727-bcfa-b15cf2f7037e";
  const ETH_PRAGUE_HQ_CONFIG_SEMA_GROUP_ID =
    "eaf2d5f1-4d8c-4342-92f7-d44e85178951";
  const ETH_PRAGUE_HQ_CONFIG = makePodboxLoginConfig(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL,
    ETH_PRAGUE_HQ_CONFIG_ID,
    ETH_PRAGUE_HQ_DESCRIPTION,
    ETH_PRAGUE_HQ_CONFIG_NAME,
    ETH_PRAGUE_RESIDENTS_NAME,
    ETH_PRAGUE_HQ_CONFIG_PIPELINE_ID,
    ETH_PRAGUE_HQ_CONFIG_SEMA_GROUP_ID
  );

  // TODO: eth berlin
  // https://staging-richard.podbox.dev/#/pipelines/e0f80908-4c9e-4bdb-9804-c88e8f64f59b

  return [
    PARC_HQ_CONFIG,
    ESMERALDA_HQ_CONFIG,
    ETH_PRAGUE_HQ_CONFIG /* TODO: eth berlin */
  ];
}

export function makePodboxLoginConfig(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string,
  id: string,
  description: string,
  name: string,
  residentName: string,
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
        name: residentName,
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
