-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('CREATE', 'RESULTS');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ANON', 'NONANON');

-- CreateEnum
CREATE TYPE "BallotType" AS ENUM ('ADVISORYVOTE', 'STRAWPOLL', 'PCDPASSUSER', 'ORGANIZERONLY', 'DEVCONNECT_STRAWPOLL', 'DEVCONNECT_FEEDBACK', 'EDGE_CITY_STRAWPOLL', 'EDGE_CITY_FEEDBACK', 'ETH_LATAM_STRAWPOLL', 'ETH_LATAM_FEEDBACK');

-- CreateEnum
CREATE TYPE "ExpiryNotifStatus" AS ENUM ('NONE', 'WEEK', 'DAY', 'HOUR');

-- CreateTable
CREATE TABLE "Ballot" (
    "ballotId" TEXT NOT NULL,
    "ballotURL" SERIAL NOT NULL,
    "ballotTitle" TEXT NOT NULL,
    "ballotDescription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry" TIMESTAMP(3) NOT NULL,
    "proof" JSONB NOT NULL,
    "pollsterType" "UserType" NOT NULL,
    "pollsterNullifier" TEXT NOT NULL,
    "pollsterSemaphoreGroupUrl" TEXT,
    "pollsterName" TEXT,
    "pollsterUuid" TEXT,
    "pollsterCommitment" TEXT,
    "voterSemaphoreGroupUrls" TEXT[],
    "voterSemaphoreGroupRoots" TEXT[],
    "ballotType" "BallotType" NOT NULL,
    "expiryNotif" "ExpiryNotifStatus" DEFAULT 'NONE',

    CONSTRAINT "Ballot_pkey" PRIMARY KEY ("ballotURL")
);

-- CreateTable
CREATE TABLE "Poll" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "body" TEXT NOT NULL,
    "options" TEXT[],
    "expiry" TIMESTAMP(3) NOT NULL,
    "ballotURL" INTEGER,

    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterType" "UserType" NOT NULL,
    "voterNullifier" TEXT NOT NULL,
    "voterSemaphoreGroupUrl" TEXT,
    "voterName" TEXT,
    "voterUuid" TEXT,
    "voterCommitment" TEXT,
    "voteIdx" INTEGER NOT NULL,
    "proof" JSONB NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TGMessage" (
    "id" TEXT NOT NULL,
    "ballotId" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "topicId" BIGINT,
    "messageId" BIGINT NOT NULL,
    "messageType" "MessageType" NOT NULL,

    CONSTRAINT "TGMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TGTopic" (
    "id" TEXT NOT NULL,
    "chatId" BIGINT NOT NULL,
    "topicId" BIGINT,
    "topicName" TEXT NOT NULL,

    CONSTRAINT "TGTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PollReceiver" (
    "tgTopicId" TEXT NOT NULL,
    "ballotTypes" "BallotType"[]
);

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_ballotId_key" ON "Ballot"("ballotId");

-- CreateIndex
CREATE UNIQUE INDEX "Ballot_pollsterNullifier_key" ON "Ballot"("pollsterNullifier");

-- CreateIndex
CREATE UNIQUE INDEX "TGTopic_topicId_chatId_key" ON "TGTopic"("topicId", "chatId");

-- CreateIndex
CREATE UNIQUE INDEX "PollReceiver_tgTopicId_key" ON "PollReceiver"("tgTopicId");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_ballotURL_fkey" FOREIGN KEY ("ballotURL") REFERENCES "Ballot"("ballotURL") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TGMessage" ADD CONSTRAINT "TGMessage_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "Ballot"("ballotId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PollReceiver" ADD CONSTRAINT "PollReceiver_tgTopicId_fkey" FOREIGN KEY ("tgTopicId") REFERENCES "TGTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

