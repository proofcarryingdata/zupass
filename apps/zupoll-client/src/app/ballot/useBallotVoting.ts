import { useZupassPopupMessages } from "@pcd/passport-interface/PassportPopup/react";
import { generateSnarkMessageHash } from "@pcd/util";
import { sha256 } from "js-sha256";
import stableStringify from "json-stable-stringify";
import { useCallback, useEffect, useRef } from "react";
import { UserType, Vote } from "../../api/prismaTypes";
import {
  MultiVoteRequest,
  MultiVoteResponse,
  MultiVoteSignal,
  PollWithCounts,
  VoteSignal
} from "../../api/requestTypes";
import { LoginState, PCDState, ZupollError } from "../../types";
import { openGroupMembershipPopup, removeQueryParameters } from "../../util";
import { voteBallot } from "../../zupoll-server-api";

/**
 * Hook that handles requesting a PCD for voting on a set of polls on a ballot.
 *
 * @param ballot Ballot that is being voted on
 * @param polls Polls in this ballot
 * @param pollToVote Map of pollId to voteIdx
 * @param onError Error handler to display in ErrorDialog
 * @param setServerLoading Passing server loading status to frontend
 * @param refresh Refresh ballot page after voting
 */
export function useBallotVoting({
  ballotId,
  ballotURL,
  ballotVoterSemaphoreGroupUrl,
  polls,
  pollToVote,
  onError,
  setServerLoading,
  refresh,
  loginState,
  returnUrl,
  voteFromUrl,
  pcdFromUrl,
  setVoteFromUrl,
  setPcdFromUrl
}: {
  ballotId: string;
  ballotURL: string;
  ballotVoterSemaphoreGroupUrl: string;
  polls: PollWithCounts[];
  pollToVote: Map<string, number | undefined>;
  onError: (err: ZupollError) => void;
  setServerLoading: (loading: boolean) => void;
  refresh: (id: string) => void;
  loginState: LoginState;
  pcdFromUrl?: string;
  voteFromUrl?: {
    polls: PollWithCounts[];
    pollToVote: Map<string, number | undefined>;
  };
  returnUrl?: string;
  setVoteFromUrl?: (a: any) => void;
  setPcdFromUrl?: (a: any) => void;
}) {
  const pcdState = useRef<PCDState>(PCDState.DEFAULT);
  const [pcdStr, _passportPendingPCDStr] = useZupassPopupMessages();

  // only accept pcdStr if we were expecting one
  useEffect(() => {
    if (pcdState.current === PCDState.AWAITING_PCDSTR) {
      pcdState.current = PCDState.RECEIVED_PCDSTR;
    }
  }, [pcdStr]);

  const submitVote = useCallback(
    async (request: MultiVoteRequest) => {
      setServerLoading(true);
      const res = await voteBallot(request, loginState.token);

      if (res === undefined) {
        const serverDownError: ZupollError = {
          title: "Voting failed",
          message: "Server is down. Contact support@zupass.org."
        };
        onError(serverDownError);
        setServerLoading(false);
        return;
      }

      if (!res.ok) {
        const resErr = await res.text();
        const err: ZupollError = {
          title: "Voting failed",
          message: `Server Error: ${resErr}`
        };
        if (resErr === "User has already voted on this ballot.") {
          err.message = "You've already voted on this ballot!";
          err.title = "Your vote was counted!";
          err.friendly = true;
          setVoted(ballotId);
          refresh(ballotId);
        }
        console.error("Error posting vote to the server: ", resErr);
        onError(err);
        setServerLoading(false);
        return;
      }

      const multiVotesResponse: MultiVoteResponse = await res.json();

      setVoted(ballotId);
      setBallotVotes(ballotId, multiVotesResponse.userVotes);
      refresh(ballotId);
    },
    [ballotId, loginState.token, onError, refresh, setServerLoading]
  );

  // process pcdStr and send request
  useEffect(() => {
    if (
      voteFromUrl &&
      pcdFromUrl &&
      setVoteFromUrl &&
      setPcdFromUrl &&
      ballotVoterSemaphoreGroupUrl
    ) {
      const parsedPcd = JSON.parse(pcdFromUrl);
      const request: MultiVoteRequest = {
        votes: [],
        ballotURL: ballotURL,
        voterSemaphoreGroupUrl: ballotVoterSemaphoreGroupUrl,
        proof: parsedPcd.pcd
      };
      voteFromUrl.polls.forEach((poll: PollWithCounts) => {
        const voteIdx = voteFromUrl.pollToVote.get(poll.id);
        if (voteIdx !== undefined) {
          const vote: Vote = {
            id: "",
            pollId: poll.id,
            voterType: UserType.ANON,
            voterNullifier: "",
            voterSemaphoreGroupUrl: ballotVoterSemaphoreGroupUrl,
            voterName: null,
            voterUuid: null,
            voterCommitment: null,
            voteIdx: voteIdx,
            proof: parsedPcd.pcd
          };
          request.votes.push(vote);
        }
      });
      submitVote(request);
      setVoteFromUrl(undefined);
      setPcdFromUrl("");
      removeQueryParameters(["proof", "finished"]);
      localStorage.removeItem("pending-vote");
    } else {
      if (pcdState.current !== PCDState.RECEIVED_PCDSTR) return;
      pcdState.current = PCDState.DEFAULT;

      // Format MultiVoteRequest properly
      const parsedPcd = JSON.parse(decodeURIComponent(pcdStr));
      const request: MultiVoteRequest = {
        votes: [],
        ballotURL: ballotURL,
        voterSemaphoreGroupUrl: ballotVoterSemaphoreGroupUrl,
        proof: parsedPcd.pcd
      };
      polls.forEach((poll: PollWithCounts) => {
        const voteIdx = pollToVote.get(poll.id);
        if (voteIdx !== undefined) {
          const vote: Vote = {
            id: "",
            pollId: poll.id,
            voterType: UserType.ANON,
            voterNullifier: "",
            voterSemaphoreGroupUrl: ballotVoterSemaphoreGroupUrl,
            voterName: null,
            voterUuid: null,
            voterCommitment: null,
            voteIdx: voteIdx,
            proof: parsedPcd.pcd
          };
          request.votes.push(vote);
        }
      });
      submitVote(request);
    }
  }, [
    pcdStr,
    ballotId,
    ballotURL,
    ballotVoterSemaphoreGroupUrl,
    pollToVote,
    polls,
    loginState,
    voteFromUrl,
    pcdFromUrl,
    submitVote,
    setVoteFromUrl,
    setPcdFromUrl
  ]);

  const createBallotVotePCD = useCallback(async () => {
    if (pollToVote.size === 0) {
      const emptyBallotError: ZupollError = {
        title: "Empty Ballot",
        message: "Answer at least one question"
      };
      onError(emptyBallotError);
      return;
    }
    pcdState.current = PCDState.AWAITING_PCDSTR;

    const multiVoteSignal: MultiVoteSignal = {
      voteSignals: []
    };

    polls.forEach((poll: PollWithCounts) => {
      const voteIdx = pollToVote.get(poll.id);
      if (voteIdx !== undefined) {
        const voteSignal: VoteSignal = {
          pollId: poll.id,
          voteIdx: voteIdx
        };
        multiVoteSignal.voteSignals.push(voteSignal);
      }
    });
    const signalHash = sha256(stableStringify(multiVoteSignal));
    const sigHashEnc = generateSnarkMessageHash(signalHash).toString();
    const externalNullifier = generateSnarkMessageHash(ballotId).toString();

    const polltoVoteList = [...pollToVote];

    localStorage.setItem(
      "pending-vote",
      stableStringify({
        pollToVoteJSON: polltoVoteList,
        polls
      })
    );

    openGroupMembershipPopup(
      loginState.config.passportAppUrl,
      window.location.origin + "/popup",
      ballotVoterSemaphoreGroupUrl,
      "zupoll",
      sigHashEnc,
      externalNullifier,
      // We know that ?ballotId=1 is the first query param
      returnUrl ? returnUrl : undefined
    );
  }, [
    loginState,
    polls,
    ballotId,
    ballotVoterSemaphoreGroupUrl,
    pollToVote,
    returnUrl,
    onError
  ]);

  return createBallotVotePCD;
}

export function votedOn(ballotId: string): boolean {
  return getVoted().includes(ballotId);
}

function getVoted(): Array<string> {
  const voted: Array<string> = JSON.parse(
    window.localStorage.getItem("voted") || "[]"
  );
  return voted;
}

export function setVoted(ballotId: string) {
  const newVoted = getVoted();
  newVoted.push(ballotId);
  window.localStorage.setItem("voted", JSON.stringify(newVoted));
}

export function getBallotVotes(ballotId: string) {
  const allVotes = JSON.parse(window.localStorage.getItem("allVotes") || "{}");
  return allVotes[ballotId] || {};
}

export function setBallotVotes(ballotId: string, userVotes: VoteSignal[]) {
  const allVotes = JSON.parse(window.localStorage.getItem("allVotes") || "{}");
  allVotes[ballotId] = {};
  for (const vote of userVotes) {
    allVotes[ballotId][vote.pollId] = vote.voteIdx;
  }
  window.localStorage.setItem("allVotes", JSON.stringify(allVotes));
}
