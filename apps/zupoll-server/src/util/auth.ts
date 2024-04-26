// eslint-disable-next-line import/no-extraneous-dependencies
import { BallotType } from ".prisma/client";
import { getPodboxConfigs } from "@pcd/zupoll-shared";
import { NextFunction, Request, Response } from "express";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import urljoin from "url-join";
import {
  EDGE_CITY_ORGANIZERS_GROUP_ID,
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_RESIDENTS_GROUP_ID,
  ETH_LATAM_ORGANIZERS_GROUP_ID,
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_RESIDENTS_GROUP_ID,
  IS_PROD,
  ZUPASS_CLIENT_URL,
  ZUPASS_SERVER_URL
} from "../../src/env";
import { logger } from "./logger";
import { AuthType } from "./types";

export const enum SemaphoreGroups {
  ZuzaluParticipants = "1",
  ZuzaluResidents = "2",
  ZuzaluVisitors = "3",
  ZuzaluOrganizers = "4",
  Everyone = "5",
  DevconnectAttendees = "6",
  DevconnectOrganizers = "7"
}

export const ACCESS_TOKEN_SECRET = IS_PROD
  ? process.env.ACCESS_TOKEN_SECRET
  : "secret";

export const PARTICIPANTS_GROUP_ID = "1";
export const ADMIN_GROUP_ID = "4";

export const ZUZALU_PARTICIPANTS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `/semaphore/`,
  PARTICIPANTS_GROUP_ID
);

export const DEVCONNECT_ORGANIZERS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `/semaphore/`,
  SemaphoreGroups.DevconnectOrganizers
);

export const DEVCONNECT_PARTICIPANTS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `/semaphore/`,
  SemaphoreGroups.DevconnectAttendees
);

export const ZUZALU_ORGANIZERS_GROUP_URL = urljoin(
  ZUPASS_SERVER_URL,
  `/semaphore/`,
  ADMIN_GROUP_ID
);

export const ZUZALU_HISTORIC_API_URL = urljoin(
  ZUPASS_SERVER_URL,
  `/semaphore/valid-historic/`
);

export const EDGE_CITY_RESIDENTS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_RESIDENTS_GROUP_ID
);
export const EDGE_CITY_ORGANIZERS_GROUP_URL = urljoin(
  EDGE_CITY_PIPELINE_URL,
  EDGE_CITY_ORGANIZERS_GROUP_ID
);

export const ETH_LATAM_ATTENDEES_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_RESIDENTS_GROUP_ID
);
export const ETH_LATAM_ORGANIZERS_GROUP_URL = urljoin(
  ETH_LATAM_PIPELINE_URL,
  ETH_LATAM_ORGANIZERS_GROUP_ID
);

export interface GroupJwtPayload extends JwtPayload {
  groupUrl: string;
  pipelineId?: string;
}

export function makeAccessToken(payload: GroupJwtPayload): string {
  const accessToken = sign(payload, ACCESS_TOKEN_SECRET!);
  return accessToken;
}

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    logger.error("no jwt provided", token);
    next();
    return;
  }

  verify(token, ACCESS_TOKEN_SECRET!, (err, group) => {
    if (err) {
      logger.error("jwt was not properly signed", authHeader);
      next();
      return;
    }

    const payload = group as GroupJwtPayload;
    logger.debug("authenticating jwt with payload", payload);

    req.authGroupUrl = payload.authGroupUrl;

    if (
      ZUZALU_PARTICIPANTS_GROUP_URL &&
      payload.groupUrl.includes(ZUZALU_PARTICIPANTS_GROUP_URL)
    ) {
      req.authUserType = AuthType.ZUZALU_PARTICIPANT;
      next();
      return;
    } else if (
      ZUZALU_ORGANIZERS_GROUP_URL &&
      payload.groupUrl.includes(ZUZALU_ORGANIZERS_GROUP_URL)
    ) {
      req.authUserType = AuthType.ZUZALU_ORGANIZER;
      next();
      return;
    } else if (
      DEVCONNECT_ORGANIZERS_GROUP_URL &&
      payload.groupUrl.includes(DEVCONNECT_ORGANIZERS_GROUP_URL)
    ) {
      req.authUserType = AuthType.DEVCONNECT_ORGANIZER;
      next();
      return;
    } else if (
      DEVCONNECT_PARTICIPANTS_GROUP_URL &&
      payload.groupUrl.includes(DEVCONNECT_PARTICIPANTS_GROUP_URL)
    ) {
      req.authUserType = AuthType.DEVCONNECT_PARTICIPANT;
      next();
      return;
    } else if (
      EDGE_CITY_RESIDENTS_GROUP_URL &&
      payload.groupUrl.includes(EDGE_CITY_RESIDENTS_GROUP_URL)
    ) {
      req.authUserType = AuthType.EDGE_CITY_RESIDENT;
      next();
      return;
    } else if (
      EDGE_CITY_ORGANIZERS_GROUP_URL &&
      payload.groupUrl.includes(EDGE_CITY_ORGANIZERS_GROUP_URL)
    ) {
      req.authUserType = AuthType.EDGE_CITY_ORGANIZER;
      next();
      return;
    } else if (
      ETH_LATAM_ATTENDEES_GROUP_URL &&
      payload.groupUrl.includes(ETH_LATAM_ATTENDEES_GROUP_URL)
    ) {
      req.authUserType = AuthType.ETH_LATAM_ATTENDEE;
      next();
      return;
    } else if (
      ETH_LATAM_ORGANIZERS_GROUP_URL &&
      payload.groupUrl.includes(ETH_LATAM_ORGANIZERS_GROUP_URL)
    ) {
      req.authUserType = AuthType.ETH_LATAM_ORGANIZER;
      next();
      return;
    }

    const podboxLoginConfigs = getPodboxConfigs(
      ZUPASS_CLIENT_URL,
      ZUPASS_SERVER_URL
    );
    const matchingPodboxLoginConfig = podboxLoginConfigs.find(
      (c) => c.groupUrl === payload.groupUrl
    );
    if (matchingPodboxLoginConfig) {
      req.authUserType = AuthType.PODBOX;
      req.pipelineId = matchingPodboxLoginConfig.pipelineId;
      next();
      return;
    }

    return res.sendStatus(403);
  });
};

export function getVisibleBallotTypesForUser(
  userAuth: AuthType | undefined
): BallotType[] {
  let relevantBallots: BallotType[] = [];

  if (userAuth === AuthType.ZUZALU_ORGANIZER) {
    relevantBallots = [
      BallotType.ADVISORYVOTE,
      BallotType.STRAWPOLL,
      BallotType.ORGANIZERONLY
    ];
  } else if (userAuth === AuthType.ZUZALU_PARTICIPANT) {
    relevantBallots = [BallotType.ADVISORYVOTE, BallotType.STRAWPOLL];
  } else if (userAuth === AuthType.DEVCONNECT_PARTICIPANT) {
    relevantBallots = [
      BallotType.DEVCONNECT_STRAWPOLL,
      BallotType.DEVCONNECT_FEEDBACK
    ];
  } else if (userAuth === AuthType.DEVCONNECT_ORGANIZER) {
    relevantBallots = [
      BallotType.DEVCONNECT_STRAWPOLL,
      BallotType.DEVCONNECT_FEEDBACK
    ];
  } else if (userAuth === AuthType.EDGE_CITY_RESIDENT) {
    relevantBallots = [
      BallotType.EDGE_CITY_STRAWPOLL,
      BallotType.EDGE_CITY_FEEDBACK
    ];
  } else if (userAuth === AuthType.EDGE_CITY_ORGANIZER) {
    relevantBallots = [
      BallotType.EDGE_CITY_STRAWPOLL,
      BallotType.EDGE_CITY_FEEDBACK
    ];
  } else if (userAuth === AuthType.ETH_LATAM_ATTENDEE) {
    relevantBallots = [
      BallotType.ETH_LATAM_STRAWPOLL,
      BallotType.ETH_LATAM_FEEDBACK
    ];
  } else if (userAuth === AuthType.ETH_LATAM_ORGANIZER) {
    relevantBallots = [
      BallotType.ETH_LATAM_STRAWPOLL,
      BallotType.ETH_LATAM_FEEDBACK
    ];
  } else if (userAuth === AuthType.PODBOX) {
    relevantBallots = [BallotType.PODBOX];
  }

  return relevantBallots;
}

export function parseIntOrThrow(int: string): number {
  const parsed = parseInt(int);

  if (isNaN(parsed)) {
    throw new Error(`invalid int: '${int}'`);
  }

  return parsed;
}
