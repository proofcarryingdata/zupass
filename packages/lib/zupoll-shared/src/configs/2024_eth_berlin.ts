import _ from "lodash";
import urljoin from "url-join";
import { makePodboxGroupUrl } from "../makePodboxGroupUrl";
import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { BallotConfig, BallotType, LoginConfig } from "../types";

export function makeEthBerlin(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ETH_BERLIN_CONFIG_ID = "ETH Berlin";
  const ETH_BERLIN_CONFIG_NAME = "ETH Berlin";
  const ETH_BERLIN_RESIDENTS_NAME = "Attendee Polls";
  const ETH_BERLIN_RESIDENTS_DESCRIPTION =
    "Polls created by ETH Berlin Attendees";
  const ETH_BERLIN_ORGANIZER_NAME = "Staff Polls";
  const ETH_BERLIN_ORGANIZER_DESCRIPTION = "Polls created by ETH Berlin Staff";
  const ETH_BERLIN_DESCRIPTION =
    "Polls created by ETH Berlin Attendees. Add to the discussion by creating a new Ballot!";
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

  const hackathonVoterGroupId = "ea3c05e7-9924-4889-920e-3830f861e8f0";
  const hackathonVoterGroupUrl = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    ETH_BERLIN_CONFIG_PIPELINE_ID,
    hackathonVoterGroupId
  );
  const organizerGroupUrl = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    ETH_BERLIN_CONFIG_PIPELINE_ID,
    ETH_BERLIN_CONFIG_ORGANIZER_SEMA_GROUP_ID
  );

  const hackathonVoterBallotConfig: BallotConfig = {
    name: "Hackathon",
    description: "Polls only non-hackers can vote on!",
    voterGroupId: hackathonVoterGroupId,
    voterGroupUrl: hackathonVoterGroupUrl,
    creatorGroupId: ETH_BERLIN_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    creatorGroupUrl: organizerGroupUrl,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    ballotType: BallotType.PODBOX,
    latestVoterGroupHashUrl: urljoin(hackathonVoterGroupUrl, "latest-root"),
    makeHistoricVoterGroupUrl: (hash) => urljoin(hackathonVoterGroupUrl, hash),
    isPublic: false,
    canCreate: true
  };

  const forOrganizer = _.clone(hackathonVoterBallotConfig);
  ETH_BERLIN_CONFIG[0].ballotConfigs?.unshift(forOrganizer);
  const forResident = _.clone(hackathonVoterBallotConfig);
  forResident.canCreate = false;
  ETH_BERLIN_CONFIG[1].ballotConfigs?.unshift(forResident);

  return ETH_BERLIN_CONFIG;
}
