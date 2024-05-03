import {
  BallotType,
  LegacyLoginConfigName,
  getPodboxConfigs
} from "@pcd/zupoll-shared";
import { Ballot } from "../../api/prismaTypes";
import { ZUPASS_CLIENT_URL, ZUPASS_SERVER_URL } from "../../env";
import { LoginState } from "../../types";
import { BallotTypeSection, BallotsForUserSection } from "./BallotTypeSection";

export function BallotListsForUser({
  loginState,
  logout,
  ballots,
  loading
}: {
  loginState: LoginState;
  logout: () => void;
  ballots: Ballot[];
  loading: boolean;
}) {
  const matchingPodboxLoginConfig = getPodboxConfigs(
    ZUPASS_CLIENT_URL,
    ZUPASS_SERVER_URL
  ).find((c) => c.name === loginState.config.name);

  return (
    <>
      {matchingPodboxLoginConfig && (
        <BallotsForUserSection
          loginState={loginState}
          loading={loading}
          ballots={ballots}
          loginConfig={matchingPodboxLoginConfig}
        />
      )}

      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER
        }
        title={"Zuzalu Organizer Polls"}
        loading={loading}
        description={"Polls visible and voteable only by Zuzalu Organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ORGANIZERONLY}
      />

      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ZUZALU_PARTICIPANT
        }
        title={"Organizer Polls"}
        loading={loading}
        description={"Official community polls from Zuzalu Organizers"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ADVISORYVOTE}
      />

      <BallotTypeSection
        visible={
          loginState.config.name === LegacyLoginConfigName.ZUZALU_ORGANIZER ||
          loginState.config.name === LegacyLoginConfigName.ZUZALU_PARTICIPANT
        }
        title={"Straw Polls"}
        loading={loading}
        description={"Unofficial polls by event participants"}
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
        loading={loading}
        description={"Polls created by Devconnect Organizers"}
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
        loading={loading}
        description={"Polls created by Devconnect Attendees"}
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
        loading={loading}
        description={"Polls created by Edge City Attendees"}
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
        loading={loading}
        description={"Polls created by Edge City Organizers"}
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
        loading={loading}
        description={"Polls created by ETH LatAm attendees"}
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
        loading={loading}
        description={"Feedback polls for Eth LatAm"}
        ballots={ballots}
        filter={(b) => b.ballotType === BallotType.ETH_LATAM_FEEDBACK}
      />
    </>
  );
}
