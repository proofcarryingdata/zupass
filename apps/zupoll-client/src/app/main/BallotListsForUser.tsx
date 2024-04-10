import { LegacyLoginConfigName } from "@pcd/zupoll-shared";
import { Ballot, BallotType } from "../../api/prismaTypes";
import { LoginState } from "../../types";
import { BallotTypeSection } from "./BallotTypeSection";

export function BallotListsForUser({
  loginState,
  logout,
  ballots
}: {
  loginState: LoginState;
  logout: () => void;
  ballots: Ballot[];
}) {
  return (
    <>
      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER
        }
        title={"Eth LatAm Feedback"}
        description={"Ballots visible and voteable only by Zuzalu organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ORGANIZERONLY}
      />

      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ZUZALU_PARTICIPANT
        }
        title={"Organizer Polls"}
        description={"Official ballots from Zuconnect organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ORGANIZERONLY}
      />

      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ZUZALU_PARTICIPANT
        }
        title={"Straw Polls"}
        description={"Unofficial ballots from event participants"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.STRAWPOLL}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.DEVCONNECT_PARTICIPANT ||
          loginState.config.name === LegacyLoginConfigName.DEVCONNECT_ORGANIZER
        }
        title={"Organizer Polls"}
        description={"Ballots created by Devconnect organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.DEVCONNECT_ORGANIZER}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.DEVCONNECT_PARTICIPANT ||
          loginState.config.name === LegacyLoginConfigName.DEVCONNECT_ORGANIZER
        }
        title={"Community Polls"}
        description={"Ballots created by Devconnect attendees"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.DEVCONNECT_STRAW}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.EDGE_CITY_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.EDGE_CITY_RESIDENT
        }
        title={"Community Polls"}
        description={"Ballots created by Edge City attendees"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.EDGE_CITY_RESIDENT}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.EDGE_CITY_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.EDGE_CITY_RESIDENT
        }
        title={"Organizer Feedback"}
        description={"Ballots created by Edge City organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.EDGE_CITY_ORGANIZER}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.ETH_LATAM_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ETH_LATAM_ATTENDEE
        }
        title={"Community Polls"}
        description={"Ballots created by ETH LatAm attendees"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ETH_LATAM_STRAWPOLL}
      />

      <BallotTypeSection
        visible={
          loginState.config.name ===
            LegacyLoginConfigName.ETH_LATAM_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ETH_LATAM_ATTENDEE
        }
        title={"Eth LatAm Feedback"}
        description={"Feedback polls for Eth Latam"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ETH_LATAM_FEEDBACK}
      />
    </>
  );
}
