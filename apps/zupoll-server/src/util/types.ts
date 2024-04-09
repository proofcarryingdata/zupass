export type Unarray<T> = T extends Array<infer U> ? U : T;

export enum AuthType {
  ZUZALU_ORGANIZER = "ZUZALU_ORGANIZER",
  ZUZALU_PARTICIPANT = "ZUZALU_PARTICIPANT",
  DEVCONNECT_PARTICIPANT = "DEVCONNECT_PARTICIPANT",
  DEVCONNECT_ORGANIZER = "DEVCONNECT_ORGANIZER",
  EDGE_CITY_RESIDENT = "EDGE_CITY_RESIDENT",
  EDGE_CITY_ORGANIZER = "EDGE_CITY_ORGANIZER",
  ETH_LATAM_ATTENDEE = "ETH_LATAM_ATTENDEE",
  ETH_LATAM_ORGANIZER = "ETH_LATAM_ORGANIZER"
}

declare global {
  namespace Express {
    export interface Request {
      authUserType?: AuthType;
    }
  }
}

export const BallotTypeNames = {
  PCDPASSUSER: "PCDPass User",
  ADVISORYVOTE: "Advisory Vote",
  STRAWPOLL: "Straw Poll",
  ORGANIZERONLY: "Organizer Only",
  DEVCONNECT_STRAWPOLL: "Community Poll",
  DEVCONNECT_FEEDBACK: "Organizer Poll",
  EDGE_CITY_STRAWPOLL: "Community Poll",
  EDGE_CITY_FEEDBACK: "Organizer Poll",
  ETH_LATAM_STRAWPOLL: "Community Poll",
  ETH_LATAM_FEEDBACK: "Organizer Poll"
};
