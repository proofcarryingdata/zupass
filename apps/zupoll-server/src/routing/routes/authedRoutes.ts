import { BallotType } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import { ApplicationContext } from "../../application";
import {
  getBallotById,
  getBallotPolls,
  getBallotsVisibleToUserType
} from "../../persistence";
import {
  authenticateJWT,
  getVisibleBallotTypesForUser,
  makeAccessToken,
  parseIntOrThrow
} from "../../util/auth";
import { sendMessage } from "../../util/bot";
import { logger } from "../../util/logger";
import { AuthType } from "../../util/types";
import { verifyGroupProof } from "../../util/verify";

export function initAuthedRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  app.post(
    "/login",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const request = req.body as LoginRequest;
        logger.info("login request");
        logger.debug(`req.body`, request);
        logger.debug(`url ${request.semaphoreGroupUrl}`);
        logger.debug(`proof:`, JSON.parse(request.proof));
        await verifyGroupProof(request.semaphoreGroupUrl, request.proof, {});
        logger.info("group membership verified");
        const accessToken = makeAccessToken({
          groupUrl: request.semaphoreGroupUrl
        });
        logger.debug("made access token", accessToken);
        res.status(200).json({ accessToken });
      } catch (e) {
        logger.error("failed to log in", e);
        next(e);
      }
    }
  );

  app.get("/ballots", authenticateJWT, async (req: Request, res: Response) => {
    logger.info("/ballots");

    const allowedUserTypes = [
      AuthType.ZUZALU_ORGANIZER,
      AuthType.ZUZALU_PARTICIPANT,
      AuthType.DEVCONNECT_ORGANIZER,
      AuthType.DEVCONNECT_PARTICIPANT,
      AuthType.EDGE_CITY_RESIDENT,
      AuthType.EDGE_CITY_ORGANIZER,
      AuthType.ETH_LATAM_ATTENDEE,
      AuthType.ETH_LATAM_ORGANIZER,
      AuthType.PODBOX
    ];

    if (!allowedUserTypes.includes(req.authUserType as any)) {
      logger.error("unauthorized user type:", req.authUserType);
      logger.error("allowed user types:", allowedUserTypes);
      res.sendStatus(403);
      return;
    }

    const ballots = await getBallotsVisibleToUserType(req.authUserType);
    res.json({ ballots });
  });

  app.get(
    "/ballot-polls/:ballotURL",
    authenticateJWT,
    async (req: Request, res: Response, next: NextFunction) => {
      logger.info("/ballots", req.params.ballotURL);

      if (
        ![
          AuthType.ZUZALU_ORGANIZER,
          AuthType.ZUZALU_PARTICIPANT,
          AuthType.DEVCONNECT_ORGANIZER,
          AuthType.DEVCONNECT_PARTICIPANT,
          AuthType.EDGE_CITY_RESIDENT,
          AuthType.EDGE_CITY_ORGANIZER,
          AuthType.ETH_LATAM_ATTENDEE,
          AuthType.ETH_LATAM_ORGANIZER,
          AuthType.PODBOX // TODO
        ].includes(req.authUserType as any)
      ) {
        res.sendStatus(403);
        return;
      }

      try {
        const ballotURL = parseIntOrThrow(req.params.ballotURL);
        const ballot = await getBallotById(ballotURL);

        if (!ballot) {
          throw new Error(`ballot with id '${ballotURL}' not found`);
        }

        if (
          ballot &&
          !getVisibleBallotTypesForUser(req.authUserType).includes(
            ballot.ballotType
          )
        ) {
          throw new Error(
            `Your role of '${req.authUserType}' is not authorized to ` +
              `view ${ballot.ballotType}. Logout and try again!`
          );
        }

        const polls = await getBallotPolls(ballotURL);

        if (polls === null) {
          throw new Error("Ballot has no polls.");
        }

        polls.forEach((poll) => {
          const counts = new Array(poll.options.length).fill(0);
          for (const vote of poll.votes) {
            counts[vote.voteIdx] += 1;
          }
          poll.votes = counts;
        });

        res.json({ ballot, polls });
      } catch (e) {
        logger.error("failed to get ballot", e);
        next(e);
      }
    }
  );

  /**
   * When the client app wants to log the user (back) in, it has to redirect
   * the user to a login page. We want this to vary depending on the type of
   * ballot the user was attempting to interact with. The client doesn't have
   * enough information to do this, so here we have a route for the client to
   * ask the server where to redirect to in order to log in.
   */
  app.get("/login-redirect", async (req: Request, res: Response) => {
    logger.info("login-redirect");

    const ballotURL = req.query.ballotURL?.toString();

    if (ballotURL) {
      const ballot = await getBallotById(parseInt(ballotURL));

      if (
        ballot?.ballotType === BallotType.EDGE_CITY_FEEDBACK ||
        ballot?.ballotType === BallotType.EDGE_CITY_STRAWPOLL
      ) {
        res.json({ url: "/denver" });
        return;
      } else if (
        ballot?.ballotType === BallotType.ETH_LATAM_FEEDBACK ||
        ballot?.ballotType === BallotType.ETH_LATAM_STRAWPOLL
      ) {
        res.json({ url: "/eth-latam" });
        return;
      }
    }

    res.json({ url: "/" });
  });

  app.post(
    "/bot-post",
    authenticateJWT,
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as BotPostRequest;

      if (![AuthType.ZUZALU_ORGANIZER].includes(req.authUserType as any)) {
        res.sendStatus(403);
        return;
      }

      try {
        sendMessage(request.message, context.bot);
      } catch (e) {
        logger.error(e);
        next(e);
        return;
      }

      res.sendStatus(200);
    }
  );
}

export type BotPostRequest = {
  message: string;
};

export type LoginRequest = {
  semaphoreGroupUrl: string;
  proof: string;
};

export type BallotPollRequest = {
  ballotURL: number;
};
