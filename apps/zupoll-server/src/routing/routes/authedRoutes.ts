import { getPodboxConfigs } from "@pcd/zupoll-shared";
import express, { NextFunction, Request, Response } from "express";
import { ApplicationContext } from "../../application";
import { ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL } from "../../env";
import {
  getBallotById,
  getBallotPolls,
  getBallotsForPipelineId,
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

        const podboxConfigs = getPodboxConfigs(
          ZUPASS_CLIENT_URL,
          ZUPASS_SERVER_URL
        );

        const pipelineId = podboxConfigs.find(
          (c) =>
            c.groupUrl === request.semaphoreGroupUrl ||
            c.ballotConfigs?.find(
              (b) =>
                b.voterGroupUrl === request.semaphoreGroupUrl ||
                b.creatorGroupUrl === request.semaphoreGroupUrl
            )
        )?.pipelineId;

        const accessToken = makeAccessToken({
          groupUrl: request.semaphoreGroupUrl,
          pipelineId
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

    if (req.authUserType !== AuthType.PODBOX) {
      const ballots = await getBallotsVisibleToUserType(req.authUserType);
      return res.json({ ballots });
    }

    if (!req.pipelineId) {
      return res.sendStatus(403);
    }

    const ballots = await getBallotsForPipelineId(req.pipelineId ?? "");
    return res.json({ ballots: ballots });
  });

  app.get(
    "/ballot-polls/:ballotURL",
    authenticateJWT,
    async (req: Request, res: Response, next: NextFunction) => {
      logger.info("/ballots", req.params.ballotURL);

      try {
        const ballotURL = parseIntOrThrow(req.params.ballotURL);
        const ballot = await getBallotById(ballotURL);

        if (!ballot) {
          throw new Error(`ballot with id '${ballotURL}' not found`);
        }

        if (!ballot.isPublic) {
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
              AuthType.PODBOX
            ].includes(req.authUserType as any)
          ) {
            const redirectInfo = getRedirectInfo(ballot);
            if (redirectInfo) {
              res.status(403).json(redirectInfo);
            } else {
              res.sendStatus(403);
            }
            return;
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

          if (ballot.pipelineId) {
            if (req.pipelineId !== ballot.pipelineId) {
              const configs = getPodboxConfigs(
                ZUPASS_CLIENT_URL,
                ZUPASS_SERVER_URL
              );

              for (const config of configs) {
                for (const ballotConfig of config.ballotConfigs ?? []) {
                  for (const ballotVoterUrl of ballot.voterSemaphoreGroupUrls) {
                    if (ballotVoterUrl.startsWith(ballotConfig.voterGroupUrl)) {
                      return res.status(403).json({
                        categoryId: config.configCategoryId,
                        configName: config.name
                      });
                    }
                  }
                }
              }

              return res.status(403).json({
                configs,
                ballot
              });
            }
          }
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

function getRedirectInfo(
  ballot: NonNullable<Awaited<ReturnType<typeof getBallotById>>>
): LoginRedirectInfo | undefined {
  const configs = getPodboxConfigs(ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL);

  for (const config of configs) {
    for (const ballotConfig of config.ballotConfigs ?? []) {
      for (const ballotVoterUrl of ballot.voterSemaphoreGroupUrls) {
        if (ballotVoterUrl.startsWith(ballotConfig.voterGroupUrl)) {
          return {
            categoryId: config.configCategoryId,
            configName: config.name
          } satisfies LoginRedirectInfo;
        }
      }
    }
  }
}

export interface LoginRedirectInfo {
  categoryId: string;
  configName: string;
}
