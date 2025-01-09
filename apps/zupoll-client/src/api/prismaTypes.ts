import { BallotType } from "@pcd/zupoll-shared";

/**
 * Model Ballot
 */
export type Ballot = {
  ballotId: string;
  ballotURL: number;
  ballotTitle: string;
  ballotDescription: string;
  createdAt: Date;
  expiry: Date;
  proof: string;
  pollsterType: UserType;
  pollsterNullifier: string;
  pollsterSemaphoreGroupUrl: string | null;
  pollsterName: string | null;
  pollsterUuid: string | null;
  pollsterCommitment: string | null;
  voterSemaphoreGroupUrls: string[];
  voterSemaphoreGroupRoots: string[];
  ballotType: BallotType;
  expiryNotif: ExpiryNotifStatus | null;
  pipelineId?: string;
  isPublic: boolean;
};

export interface ObjectOption {
  text: string;
  externalLink: string;
  imageUrl?: string;
}

/**
 * Model Poll
 */
export type Poll = {
  id: string;
  createdAt: Date;
  body: string;
  /**
   * Either a string or a `JSON.stringify`'d {@link ObjectOption}
   */
  options: string[];
  expiry: Date;
  ballotURL: number | null;
};

/**
 * Model Vote
 */
export type Vote = {
  id: string;
  pollId: string;
  voterType: UserType;
  voterNullifier: string;
  voterSemaphoreGroupUrl: string | null;
  voterName: string | null;
  voterUuid: string | null;
  voterCommitment: string | null;
  voteIdx: number;
  proof: string;
};

export const UserType = {
  ANON: "ANON",
  NONANON: "NONANON"
};

export type UserType = (typeof UserType)[keyof typeof UserType];

export const ExpiryNotifStatus = {
  NONE: "NONE",
  WEEK: "WEEK",
  DAY: "DAY",
  HOUR: "HOUR"
};

export type ExpiryNotifStatus =
  (typeof ExpiryNotifStatus)[keyof typeof ExpiryNotifStatus];
