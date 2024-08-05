import urljoin from "url-join";
import { makePodboxGroupUrl } from "./makePodboxGroupUrl.js";
import { BallotType, LoginConfig } from "./types.js";

export function makePodboxLoginConfigSingleGroup(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string,
  id: string,
  description: string,
  name: string,
  residentName: string,
  residentDescription: string,
  pipelineId: string,
  residentSemaphoreGroupId: string,
  year: number,
  month: number,
  day: number
): LoginConfig[] {
  const RESIDENT_GROUP_URL = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    pipelineId,
    residentSemaphoreGroupId
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
    name: name + " Resident",
    description: description,
    buttonName: "Sign in as Attendee",
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
        isDefault: true
      }
    ]
  };
  return [RESIDENT_CONFIG];
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
    name: name + " Resident",
    description: description,
    buttonName: "Sign in as Attendee",
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
        canCreate: false
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
        isDefault: true
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
    buttonName: "Sign in as Organizer",
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
        makeHistoricVoterGroupUrl: (hash) => urljoin(RESIDENT_GROUP_URL, hash)
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
        isDefault: true
      }
    ]
  };

  return [STAFF_CONFIG, RESIDENT_CONFIG];
}
