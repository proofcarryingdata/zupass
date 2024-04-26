import {
  Ballot,
  BallotType,
  ExpiryNotifStatus,
  MessageType,
  Poll,
  UserType,
  Vote
} from "@prisma/client";
import { Message } from "grammy/types";
import { CreateBallotRequest } from "./routing/routes/pollRoutes";
import { getVisibleBallotTypesForUser } from "./util/auth";
import { prisma } from "./util/prisma";
import { AuthType } from "./util/types";

export async function getAllBallotsForAlerts() {
  return prisma.ballot.findMany({
    select: {
      ballotTitle: true,
      ballotURL: true,
      expiry: true,
      expiryNotif: true,
      ballotDescription: true,
      polls: true,
      ballotType: true
    },
    orderBy: { expiry: "desc" },
    where: {
      NOT: {
        ballotType: {
          in: [BallotType.PCDPASSUSER, BallotType.ORGANIZERONLY]
        }
      }
    }
  });
}

export async function updateBallotExpiryNotif(
  ballotURL: number,
  expiryNotif: ExpiryNotifStatus
) {
  await prisma.ballot.update({
    where: {
      ballotURL
    },
    data: {
      expiryNotif
    }
  });
}

export async function getBallotsVisibleToUserType(
  userType: AuthType | undefined
) {
  return prisma.ballot.findMany({
    select: {
      ballotTitle: true,
      ballotURL: true,
      expiry: true,
      ballotType: true,
      createdAt: true
    },
    orderBy: { expiry: "desc" },
    where: {
      ballotType: {
        in: getVisibleBallotTypesForUser(userType)
      }
    }
  });
}

export async function getBallotsForPipelineId(pipelineId: string) {
  return prisma.ballot.findMany({
    select: {
      ballotTitle: true,
      ballotURL: true,
      expiry: true,
      ballotType: true,
      createdAt: true
    },
    orderBy: { expiry: "desc" },
    where: {
      ballotType: {
        in: [BallotType.PODBOX]
      },
      pipelineId
    }
  });
}

export async function getBallotById(ballotURL: number) {
  return prisma.ballot.findUnique({
    where: {
      ballotURL
    }
  });
}

export async function getBallotByIdAndType(
  ballotURL: number,
  userType: AuthType | undefined
) {
  return prisma.ballot.findFirst({
    where: {
      ballotURL: ballotURL,
      ballotType: {
        in: getVisibleBallotTypesForUser(userType)
      }
    }
  });
}

export async function getVoteByNullifier(nullifier: string) {
  return prisma.vote.findFirst({
    where: {
      voterNullifier: nullifier
    }
  });
}

export async function createVote(
  vote: Vote,
  voterType: UserType,
  nullifier: string,
  semaphoreGroupUrl: string,
  proof: string
) {
  return prisma.vote.create({
    data: {
      pollId: vote.pollId,
      voterType,
      voterNullifier: nullifier,
      voterSemaphoreGroupUrl: semaphoreGroupUrl,
      voteIdx: vote.voteIdx,
      proof
    }
  });
}

export async function getPollById(pollId: string) {
  return prisma.poll.findUnique({
    where: {
      id: pollId
    },
    include: { votes: true }
  });
}

export async function getBallotPolls(ballotURL: number) {
  return prisma.poll.findMany({
    where: {
      ballotURL
    },
    include: {
      votes: {
        select: {
          voteIdx: true
        }
      }
    },
    orderBy: { expiry: "asc" }
  });
}

export async function createBallot(
  request: CreateBallotRequest,
  nullifier: string
) {
  return prisma.ballot.create({
    data: {
      ballotTitle: request.ballot.ballotTitle,
      ballotDescription: request.ballot.ballotDescription,
      expiry: request.ballot.expiry,
      proof: request.proof,
      pollsterType: "ANON",
      pollsterNullifier: nullifier,
      pollsterSemaphoreGroupUrl: request.ballot.pollsterSemaphoreGroupUrl,
      voterSemaphoreGroupRoots: request.ballot.voterSemaphoreGroupRoots,
      voterSemaphoreGroupUrls: request.ballot.voterSemaphoreGroupUrls,
      ballotType: request.ballot.ballotType,
      pipelineId: request.ballot.pipelineId
    }
  });
}

export async function createPoll(poll: Poll, ballot: Ballot) {
  return prisma.poll.create({
    data: {
      body: poll.body,
      options: poll.options,
      ballotURL: ballot.ballotURL,
      expiry: ballot.expiry
    }
  });
}

export async function saveTgMessage(
  msg: Message.TextMessage,
  forBallotId: string,
  messageType: MessageType
) {
  return prisma.tGMessage.create({
    data: {
      messageId: msg.message_id,
      chatId: msg.chat.id,
      topicId: msg.message_thread_id,
      ballotId: forBallotId,
      messageType
    }
  });
}

export async function findTgMessages(
  ballotId: string,
  messageType: MessageType
) {
  return prisma.tGMessage.findMany({
    where: {
      ballotId,
      messageType
    }
  });
}

export async function findTgTopic(tgTopicId: string) {
  return prisma.tGTopic.findFirst({
    where: {
      id: tgTopicId
    }
  });
}

export async function upsertPollReceiver(
  tgTopicId: string,
  ballotTypes: BallotType[]
) {
  return prisma.pollReceiver.upsert({
    where: {
      tgTopicId
    },
    update: {
      ballotTypes
    },
    create: {
      tgTopicId,
      ballotTypes
    }
  });
}

export async function getAllPollReceivers() {
  return prisma.pollReceiver.findMany();
}

export async function deletePollReceiver(tgTopicId: string) {
  return prisma.pollReceiver.delete({
    where: {
      tgTopicId
    }
  });
}

export async function upsertTgTopic(
  id: string,
  chatId: number,
  topicId: number,
  topicName: string
) {
  return prisma.tGTopic.upsert({
    where: {
      id
    },
    update: {
      topicName
    },
    create: {
      id,
      topicId,
      chatId,
      topicName
    }
  });
}
