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
};

/**
 * Model Poll
 */
export type Poll = {
  id: string;
  createdAt: Date;
  body: string;
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

/**
 * Enums, based on
 * https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
 */
export const BallotType = {
  ADVISORYVOTE: "ADVISORYVOTE",
  STRAWPOLL: "STRAWPOLL",
  ORGANIZERONLY: "ORGANIZERONLY",
  DEVCONNECT_STRAW: "DEVCONNECT_STRAWPOLL",
  DEVCONNECT_ORGANIZER: "DEVCONNECT_FEEDBACK",
  EDGE_CITY_RESIDENT: "EDGE_CITY_STRAWPOLL",
  EDGE_CITY_ORGANIZER: "EDGE_CITY_FEEDBACK",
  ETH_LATAM_STRAWPOLL: "ETH_LATAM_STRAWPOLL",
  ETH_LATAM_FEEDBACK: "ETH_LATAM_FEEDBACK"
};

export type BallotType = (typeof BallotType)[keyof typeof BallotType];

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
