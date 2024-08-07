import _ from "lodash";
import urljoin from "url-join";
import { makePodboxGroupUrl } from "../makePodboxGroupUrl";
import { makePodboxLoginConfigs } from "../makePodboxLoginConfigs";
import { BallotConfig, BallotType, LoginConfig } from "../types";

export function makeEthPrague(
  ZUPASS_CLIENT_URL: string,
  ZUPASS_SERVER_URL: string
): LoginConfig[] {
  const ETH_PRAGUE_CONFIG_ID = "ETHPrague";
  const ETH_PRAGUE_CONFIG_NAME = "ETHPrague";
  const ETH_PRAGUE_RESIDENTS_NAME = "Attendee Polls";
  const ETH_PRAGUE_RESIDENTS_DESCRIPTION =
    "Polls created by ETHPrague Attendees";
  const ETH_PRAGUE_ORGANIZER_NAME = "Staff Polls";
  const ETH_PRAGUE_ORGANIZER_DESCRIPTION = "Polls created by ETHPrague Staff";
  const ETH_PRAGUE_DESCRIPTION =
    "Polls created by ETHPrague Attendees. Add to the discussion by creating a new Ballot!";
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

  const hackathonVoterGroupId = "702b55e1-0e11-42c8-abab-6679c578a28a";
  const hackathonVoterGroupUrl = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    ETH_PRAGUE_CONFIG_PIPELINE_ID,
    hackathonVoterGroupId
  );

  const audienceVoterGroupId = "228e3b1a-18a9-454c-9abb-72185bbb01cb";
  const audienceVoterGroupUrl = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    ETH_PRAGUE_CONFIG_PIPELINE_ID,
    audienceVoterGroupId
  );

  const organizerGroupUrl = makePodboxGroupUrl(
    ZUPASS_SERVER_URL,
    ETH_PRAGUE_CONFIG_PIPELINE_ID,
    ETH_PRAGUE_CONFIG_ORGANIZER_SEMA_GROUP_ID
  );

  const hackerBallotType: BallotConfig = {
    name: "Hackathon Polls",
    description: "Polls for ETHPrague hackers to vote on",
    voterGroupId: hackathonVoterGroupId,
    voterGroupUrl: hackathonVoterGroupUrl,
    creatorGroupId: ETH_PRAGUE_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    creatorGroupUrl: organizerGroupUrl,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    ballotType: BallotType.PODBOX,
    latestVoterGroupHashUrl: urljoin(hackathonVoterGroupUrl, "latest-root"),
    makeHistoricVoterGroupUrl: (hash) => urljoin(hackathonVoterGroupUrl, hash),
    canCreate: true
  };

  const audienceBallotType: BallotConfig = {
    name: "Audience Polls",
    description: "Polls for ETHPrague audience members to vote on",
    voterGroupId: audienceVoterGroupId,
    voterGroupUrl: audienceVoterGroupUrl,
    creatorGroupId: ETH_PRAGUE_CONFIG_ORGANIZER_SEMA_GROUP_ID,
    creatorGroupUrl: organizerGroupUrl,
    passportServerUrl: ZUPASS_SERVER_URL,
    passportAppUrl: ZUPASS_CLIENT_URL,
    ballotType: BallotType.PODBOX,
    latestVoterGroupHashUrl: urljoin(audienceVoterGroupUrl, "latest-root"),
    makeHistoricVoterGroupUrl: (hash) => urljoin(audienceVoterGroupUrl, hash),
    canCreate: true
  };

  ETH_PRAGUE_CONFIG[0].ballotConfigs?.splice(
    1,
    0,
    _.clone(hackerBallotType),
    _.clone(audienceBallotType)
  );
  ETH_PRAGUE_CONFIG[1].ballotConfigs?.splice(
    1,
    0,
    Object.assign(_.clone(hackerBallotType), { canCreate: false }),
    Object.assign(_.clone(audienceBallotType), { canCreate: false })
  );

  return ETH_PRAGUE_CONFIG;
}
