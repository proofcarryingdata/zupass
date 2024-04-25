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
  const PARC_HQ_RESIDENTS_DESCRIPTION = "Ballots created by somoeone at 0xPARC";
  const PARC_HQ_ORGANIZER_NAME = "Dev Ballots";
  const PARC_HQ_ORGANIZER_DESCRIPTION = "Ballots created by the devs of Zupoll";
  const PARC_HQ_DESCRIPTION = "0xPARC";
  const PARC_HQ_CONFIG_PIPELINE_ID = "432a2e29-b884-4fd8-886b-04b42ad3242f";
  const PARC_HQ_CONFIG_RESIDENT_SEMA_GROUP_ID =
    "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
  const PARC_HQ_CONFIG_ORGANIZER_SEMA_GROUP_ID =
    "4bfd3c3a-9ec5-450d-b407-7454e20d7e58";
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

  const ESMERALDA_CONFIG_ID = "Edge Esmeralda";
  const ESMERALDA_CONFIG_NAME = "Edge Esmeralda";
  const ESMERALDA_RESIDENTS_NAME = "Resident Poll";
  const ESMERALDA_RESIDENTS_DESCRIPTION =
    "Polls created by members of Edge Esmeralda";
  const ESMERALDA_ORGANIZER_NAME = "Staff Poll";
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

  const ETH_PRAGUE_CONFIG_ID = "ETH Prague";
  const ETH_PRAGUE_CONFIG_NAME = "ETH Prague";
  const ETH_PRAGUE_RESIDENTS_NAME = "ETH Prague Attendees";
  const ETH_PRAGUE_RESIDENTS_DESCRIPTION =
    "Ballots created by ETH Prague attendees";
  const ETH_PRAGUE_ORGANIZER_NAME = "ETH Prague Staff Ballots";
  const ETH_PRAGUE_ORGANIZER_DESCRIPTION =
    "Ballots created by ETH Prague Staff";
  const ETH_PRAGUE_DESCRIPTION =
    "Ballots created by ETH Prague Attendees. Add to the discussion by creating a new Ballot!";
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

  const ETH_BERLIN_CONFIG_ID = "ETH Berlin";
  const ETH_BERLIN_CONFIG_NAME = "ETH Berlin";
  const ETH_BERLIN_RESIDENTS_NAME = "ETH Berlin Attendees";
  const ETH_BERLIN_RESIDENTS_DESCRIPTION =
    "Ballots created by ETH Berlin Attendees";
  const ETH_BERLIN_ORGANIZER_NAME = "Staff Ballots";
  const ETH_BERLIN_ORGANIZER_DESCRIPTION =
    "Ballots created by ETH Berlin Staff";
  const ETH_BERLIN_DESCRIPTION =
    "Ballots created by ETH Berlin Attendees. Add to the discussion by creating a new Ballot!";
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

  return [
    ...PARC_HQ_CONFIG,
    ...ESMERALDA_CONFIG,
    ...ETH_PRAGUE_CONFIG,
    ...ETH_BERLIN_CONFIG
  ];
}

export function makePodboxLoginConfigs(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string,
  id: string,
  description: string,
  name: string,
  residentName: string,
  residentDescription: string,
  organizerName: string,
  organizerDescription: string,
  pipelineId: string,
  residentSemaphoreGroupId: string,
  organizerSemaphoreGroupId: string,
  year: number,
  month: number,
  day: number
): LoginConfig[] {
  const RESIDENT_GROUP_URL = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    pipelineId,
    residentSemaphoreGroupId
  );

  const ORGANIZER_GROUP_URL = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    pipelineId,
    organizerSemaphoreGroupId
  );

  const RESIDENT_CONFIG: LoginConfig = {
    pipelineId,
    year,
    month,
    day,
    configCategoryId: id,
    groupId: residentSemaphoreGroupId,
    groupUrl: RESIDENT_GROUP_URL,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    name: name,
    description: description,
    buttonName: "Login",
    canCreateBallotTypes: [BallotType.PODBOX],
    ballotConfigs: [
      {
        name: residentName,
        description: residentDescription,
        voterGroupId: residentSemaphoreGroupId,
        voterGroupUrl: RESIDENT_GROUP_URL,
        creatorGroupId: residentSemaphoreGroupId,
        creatorGroupUrl: RESIDENT_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX,
        latestVoterGroupHashUrl: urljoin(RESIDENT_GROUP_URL, "latest-root"),
        makeHistoricVoterGroupUrl: (hash) => urljoin(RESIDENT_GROUP_URL, hash),
        isPublic: false
      }
    ]
  };

  const STAFF_CONFIG: LoginConfig = {
    pipelineId,
    year,
    month,
    day,
    configCategoryId: id,
    groupId: organizerSemaphoreGroupId,
    groupUrl: ORGANIZER_GROUP_URL,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    name: name + " Organizer",
    description: description,
    buttonName: "Staff",
    canCreateBallotTypes: [BallotType.PODBOX],
    ballotConfigs: [
      {
        name: organizerName,
        description: organizerDescription,
        voterGroupId: residentSemaphoreGroupId,
        voterGroupUrl: RESIDENT_GROUP_URL,
        creatorGroupId: organizerSemaphoreGroupId,
        creatorGroupUrl: ORGANIZER_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX,
        latestVoterGroupHashUrl: urljoin(RESIDENT_GROUP_URL, "latest-root"),
        makeHistoricVoterGroupUrl: (hash) => urljoin(RESIDENT_GROUP_URL, hash),
        isPublic: false
      },
      {
        name: residentName,
        description: residentDescription,
        voterGroupId: residentSemaphoreGroupId,
        voterGroupUrl: RESIDENT_GROUP_URL,
        creatorGroupId: residentSemaphoreGroupId,
        creatorGroupUrl: RESIDENT_GROUP_URL,
        passportServerUrl: ZUPASS_SERVER_URL,
        passportAppUrl: ZUPASS_CLIENT_URL,
        ballotType: BallotType.PODBOX,
        latestVoterGroupHashUrl: urljoin(RESIDENT_GROUP_URL, "latest-root"),
        makeHistoricVoterGroupUrl: (hash) => urljoin(RESIDENT_GROUP_URL, hash),
        isPublic: false
      }
    ]
  };

  return [STAFF_CONFIG, RESIDENT_CONFIG];
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
