import { getPodboxConfigs } from "@pcd/zupoll-shared";
import {
  Ballot,
  BallotType,
  MessageType,
  Poll,
  UserType,
  Vote
} from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import { InlineKeyboard } from "grammy";
import { sha256 } from "js-sha256";
import stableStringify from "json-stable-stringify";
import { ApplicationContext } from "../../application";
import { ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL } from "../../env";
import {
  createBallot,
  createPoll,
  createVote,
  findTgMessages,
  getBallotById,
  getPollById,
  getVoteByNullifier,
  saveTgMessage
} from "../../persistence";
import {
  DEVCONNECT_ORGANIZERS_GROUP_URL,
  DEVCONNECT_PARTICIPANTS_GROUP_URL,
  EDGE_CITY_ORGANIZERS_GROUP_URL,
  EDGE_CITY_RESIDENTS_GROUP_URL,
  ETH_LATAM_ATTENDEES_GROUP_URL,
  ETH_LATAM_ORGANIZERS_GROUP_URL,
  ZUZALU_ORGANIZERS_GROUP_URL,
  ZUZALU_PARTICIPANTS_GROUP_URL,
  authenticateJWT
} from "../../util/auth";
import {
  PollWithVotes,
  formatPollCreated,
  generatePollHTML,
  sendMessageV2
} from "../../util/bot";
import { logger } from "../../util/logger";
import { AuthType } from "../../util/types";
import { verifyGroupProof } from "../../util/verify";

/**
 * The endpoints in this function accepts proof (PCD) in the request. It verifies
 * the proof before proceed. So in this case no other type of auth (e.g. JWT)
 * is needed.
 */
export function initPCDRoutes(
  app: express.Application,
  context: ApplicationContext
): void {
  app.post(
    "/create-ballot",
    authenticateJWT,
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as CreateBallotRequest;
      const prevBallot = await getBallotById(request.ballot.ballotURL);

      if (prevBallot !== null) {
        throw new Error("Ballot already exists with this URL.");
      }

      if (req.authUserType === AuthType.ZUZALU_PARTICIPANT) {
        if (
          request.ballot.ballotType === BallotType.ADVISORYVOTE ||
          request.ballot.ballotType === BallotType.ORGANIZERONLY
        ) {
          throw new Error(
            `${req.authUserType} user can't create this ballot type`
          );
        }
      } else if (req.authUserType === AuthType.ZUZALU_ORGANIZER) {
        if (request.ballot.ballotType === BallotType.PCDPASSUSER) {
          throw new Error(
            `${req.authUserType} user can't create this ballot type`
          );
        }
      }

      const ballotSignal: BallotSignal = {
        pollSignals: [],
        ballotTitle: request.ballot.ballotTitle,
        ballotDescription: request.ballot.ballotDescription,
        ballotType: request.ballot.ballotType,
        expiry: request.ballot.expiry,
        voterSemaphoreGroupUrls: request.ballot.voterSemaphoreGroupUrls,
        voterSemaphoreGroupRoots: request.ballot.voterSemaphoreGroupRoots,
        pipelineId: request.ballot.pipelineId ?? undefined,
        isPublic: request.ballot.isPublic
      };

      request.polls.forEach((poll: Poll) => {
        const pollSignal: PollSignal = {
          body: poll.body,
          options: poll.options
        };
        ballotSignal.pollSignals.push(pollSignal);
      });

      const signalHash = sha256(stableStringify(ballotSignal) ?? "");
      logger.info(`[SERVER BALLOT SIGNAL]`, ballotSignal);

      try {
        if (request.ballot.pollsterType === UserType.ANON) {
          let groupUrls = [ZUZALU_PARTICIPANTS_GROUP_URL];

          switch (request.ballot.ballotType) {
            case BallotType.ADVISORYVOTE:
            case BallotType.ORGANIZERONLY:
              groupUrls.push(ZUZALU_ORGANIZERS_GROUP_URL);
              break;
            case BallotType.STRAWPOLL:
              groupUrls.push(ZUZALU_PARTICIPANTS_GROUP_URL);
              break;
            case BallotType.DEVCONNECT_STRAWPOLL:
              groupUrls.push(DEVCONNECT_PARTICIPANTS_GROUP_URL);
              break;
            case BallotType.DEVCONNECT_FEEDBACK:
              groupUrls.push(DEVCONNECT_ORGANIZERS_GROUP_URL);
              break;
            case BallotType.EDGE_CITY_STRAWPOLL:
              groupUrls.push(EDGE_CITY_RESIDENTS_GROUP_URL);
              break;
            case BallotType.EDGE_CITY_FEEDBACK:
              groupUrls.push(EDGE_CITY_ORGANIZERS_GROUP_URL);
              break;
            case BallotType.ETH_LATAM_STRAWPOLL:
              groupUrls.push(ETH_LATAM_ATTENDEES_GROUP_URL);
              break;
            case BallotType.ETH_LATAM_FEEDBACK:
              groupUrls.push(ETH_LATAM_ORGANIZERS_GROUP_URL);
              break;
            case BallotType.PODBOX:
              groupUrls = getPodboxConfigs(
                ZUPASS_CLIENT_URL,
                ZUPASS_SERVER_URL
              ).map((c) => c.groupUrl);
              break;
          }

          const nullifier = await verifyGroupProof(
            request.ballot.pollsterSemaphoreGroupUrl!,
            request.proof,
            {
              signal: signalHash,
              allowedGroups: groupUrls,
              claimedExtNullifier: signalHash
            }
          );

          logger.info("Valid proof with nullifier", nullifier);

          const newBallot = await createBallot(request, nullifier);

          await Promise.all(
            request.polls.map(async (poll) => {
              // store poll order in options so we can maintain the same
              // database schema and maintain data
              poll.options.push("poll-order-" + poll.id);
              return createPoll(poll, newBallot);
            })
          );

          try {
            // Send MSG first, so if it fails, we don't add poll to DB.
            if (
              request.ballot.ballotType !== BallotType.PCDPASSUSER &&
              request.ballot.ballotType !== BallotType.ORGANIZERONLY
            ) {
              // send message on TG channel, if bot is setup
              const post = formatPollCreated(newBallot, request.polls);
              const msgs = await sendMessageV2(
                post,
                request.ballot.ballotType,
                context.bot
              );
              if (msgs) {
                for (const msg of msgs) {
                  await saveTgMessage(
                    msg,
                    newBallot.ballotId,
                    MessageType.CREATE
                  );
                }
              }
            }
          } catch (e) {
            logger.error(`error sending message`, e);
          }

          res.json({
            url: newBallot.ballotURL
          });
        } else {
          throw new Error("Unknown pollster type.");
        }
      } catch (e) {
        console.error(e);
        next(e);
      }
    }
  );

  app.post(
    "/vote-ballot",
    authenticateJWT,
    async (req: Request, res: Response, next: NextFunction) => {
      const request = req.body as MultiVoteRequest;

      const votePollIds = new Set<string>();
      const multiVoteSignal: MultiVoteSignal = {
        voteSignals: []
      };
      for (const vote of request.votes) {
        // To confirm there is at most one vote per poll
        if (votePollIds.has(vote.pollId)) {
          if (process.env.NODE_ENV !== "development")
            throw new Error("Duplicate vote for a poll.");
        }
        votePollIds.add(vote.pollId);

        const voteSignal: VoteSignal = {
          pollId: vote.pollId,
          voteIdx: vote.voteIdx
        };
        multiVoteSignal.voteSignals.push(voteSignal);
      }
      const signalHash = sha256(stableStringify(multiVoteSignal) ?? "");

      const allVotes: PollWithVotes[] = [];

      try {
        for (const vote of request.votes) {
          const poll = await getPollById(vote.pollId);

          if (poll === null) {
            throw new Error("Invalid poll id.");
          }
          if (vote.voteIdx < 0 || vote.voteIdx >= poll.options.length) {
            throw new Error("Invalid vote option.");
          }
          if (poll.expiry < new Date()) {
            throw new Error("Poll has expired.");
          }
          if (vote.voterSemaphoreGroupUrl === undefined) {
            throw new Error("No Semaphore group URL attached.");
          }
          if (vote.voterType !== UserType.ANON) {
            throw new Error("Unknown voter type.");
          }
        }

        const ballotURL = parseInt(request.ballotURL);
        if (isNaN(ballotURL)) {
          throw new Error("Invalid ballot URL.");
        }
        const ballot = await getBallotById(ballotURL);
        if (ballot === null) {
          throw new Error("Can't find the given ballot.");
        }

        // Only use of voterSemaphoreGroupUrl is to check if it's in the list of
        // allowed groups. The proof is verified by checking that the root in the
        // PCD matches one of the roots in ballot.voterSemaphoreGroupRoots
        const nullifier = await verifyGroupProof(
          request.voterSemaphoreGroupUrl,
          request.proof,
          {
            signal: signalHash,
            allowedGroups: ballot.voterSemaphoreGroupUrls,
            allowedRoots: ballot.voterSemaphoreGroupRoots,
            claimedExtNullifier: ballot.ballotId.toString()
          }
        );

        const previousBallotVote = await getVoteByNullifier(nullifier);

        if (previousBallotVote !== null) {
          // This error string is used in the frontend to determine whether to
          // show the "already voted" message and thus display the vote results.
          // Do not change without changing the corresponding check in frontend.
          if (!process.env.ALLOW_REPEAT_VOTES)
            throw new Error("User has already voted on this ballot.");
        }

        for (const vote of request.votes) {
          await createVote(
            vote,
            UserType.ANON,
            nullifier,
            request.voterSemaphoreGroupUrl,
            request.proof
          );

          const poll = await getPollById(vote.pollId);

          if (poll) allVotes.push(poll);
        }

        const multiVoteResponse: MultiVoteResponse = {
          userVotes: multiVoteSignal.voteSignals
        };

        const originalBallotMsg = await findTgMessages(
          ballot.ballotId,
          MessageType.CREATE
        );

        const voteBallotMsg = await findTgMessages(
          ballot.ballotId,
          MessageType.RESULTS
        );

        if (voteBallotMsg?.length > 0) {
          for (const voteMsg of voteBallotMsg) {
            try {
              const msg = await context.bot?.api.editMessageText(
                voteMsg.chatId.toString(),
                parseInt(voteMsg.messageId.toString()),
                generatePollHTML(ballot, allVotes),
                {
                  parse_mode: "HTML",
                  // disable_web_page_preview: true,
                  reply_markup: new InlineKeyboard().url(
                    `See more / Vote`,
                    `${process.env.BOT_ZUPOLL_LINK}?startapp=${ballot.ballotURL}`
                  )
                }
              );
              if (msg) {
                logger.info(`Edited vote msg`, msg);
              }
            } catch (error) {
              context.rollbarService?.reportError(error);
              logger.error(`GRAMMY ERROR`, error);
            }
          }
        } else if (originalBallotMsg?.length > 0) {
          for (const voteMsg of originalBallotMsg) {
            try {
              const msg = await context.bot?.api.sendMessage(
                voteMsg.chatId.toString(),
                generatePollHTML(ballot, allVotes),
                {
                  reply_to_message_id: parseInt(voteMsg.messageId.toString()),
                  parse_mode: "HTML",
                  // disable_web_page_preview: true,
                  reply_markup: new InlineKeyboard().url(
                    `See more / Vote`,
                    `${process.env.BOT_ZUPOLL_LINK}?startapp=${ballot.ballotURL}`
                  )
                }
              );
              if (msg) {
                await saveTgMessage(msg, voteMsg.ballotId, MessageType.RESULTS);
                logger.info(`Updated DB with RESULTS`);
              }
            } catch (error) {
              context.rollbarService?.reportError(error);
              logger.error(`GRAMMY ERROR`, error);
            }
          }
        }
        res.json(multiVoteResponse);
      } catch (e) {
        context.rollbarService?.reportError(e);
        console.error(`[ERROR]`, e);
        next(e);
      }
    }
  );
}

export type CreateBallotRequest = {
  ballot: Ballot;
  polls: Poll[];
  proof: string;
};

export type BallotSignal = {
  pollSignals: PollSignal[];
  ballotTitle: string;
  ballotDescription: string;
  ballotType: BallotType;
  expiry: Date;
  voterSemaphoreGroupUrls: string[];
  voterSemaphoreGroupRoots: string[];
  pipelineId?: string;
  isPublic: boolean;
};

export type PollSignal = {
  body: string;
  options: string[];
};

export type MultiVoteRequest = {
  votes: Vote[];
  ballotURL: string;
  voterSemaphoreGroupUrl: string;
  proof: string;
};

export type MultiVoteSignal = {
  voteSignals: VoteSignal[];
};

export type VoteSignal = {
  pollId: string;
  voteIdx: number;
};

export type MultiVoteResponse = {
  userVotes: VoteSignal[];
};
