import { useZupassPopupMessages } from "@pcd/passport-interface";
import { generateSnarkMessageHash } from "@pcd/util";
import { BallotConfig, BallotType } from "@pcd/zupoll-shared";
import { sha256 } from "js-sha256";
import stableStringify from "json-stable-stringify";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { Poll, UserType } from "../../api/prismaTypes";
import {
  BallotSignal,
  CreateBallotRequest,
  PollSignal
} from "../../api/requestTypes";
import { LoginState, PCDState, ZupollError } from "../../types";
import {
  USE_CREATE_BALLOT_REDIRECT,
  openGroupMembershipPopup,
  removeQueryParameters
} from "../../util";
import { createBallot } from "../../zupoll-server-api";
import { useHistoricSemaphoreUrl } from "./useHistoricSemaphoreUrl";

export interface BallotFromUrl {
  ballotConfig: BallotConfig;
  ballotSignal: BallotSignal;
  polls: Poll[];
}

interface GenerateBallotArgs {
  ballotTitle: string;
  ballotDescription: string;
  expiry: Date;
  ballotConfig?: BallotConfig;
  voterGroupUrls: string[];
  voterGroupRoots: string[];
  proof: string;
  ballotType: BallotType;
  polls: Poll[];
  creatorGroupUrl: string;
}

const generateBallotRequest = (
  args: GenerateBallotArgs
): CreateBallotRequest => {
  const finalRequest: CreateBallotRequest = {
    ballot: {
      ballotId: "",
      ballotURL: 0,
      ballotTitle: args.ballotTitle,
      ballotDescription: args.ballotDescription,
      createdAt: new Date(),
      expiry: args.expiry,
      proof: args.proof,
      pollsterType: UserType.ANON,
      pollsterNullifier: "",
      pollsterName: null,
      pollsterUuid: null,
      pollsterCommitment: null,
      expiryNotif: null,
      pollsterSemaphoreGroupUrl: args.creatorGroupUrl,
      voterSemaphoreGroupUrls: args.voterGroupUrls,
      voterSemaphoreGroupRoots: args.voterGroupRoots,
      ballotType: args.ballotType
    },
    polls: args.polls,
    proof: args.proof
  };
  return finalRequest;
};

/**
 * Hook that handles requesting a PCD for creating a ballot.
 *
 * @param ballotTitle title of ballot
 * @param ballotDescription description of ballot
 * @param ballotType type of ballot
 * @param expiry expiry date of ballot
 * @param polls polls in this ballot
 * @param onError Error handler to display in ErrorOverlay
 * @param setServerLoading Passing server loading status to frontend
 */
export function useCreateBallot({
  ballotTitle,
  ballotDescription,
  ballotConfig,
  expiry,
  polls,
  onError,
  setServerLoading,
  loginState,
  ballotFromUrl,
  pcdFromUrl,
  setBallotFromUrl,
  setPcdFromUrl,
  url
}: {
  ballotTitle: string;
  ballotDescription: string;
  ballotConfig?: BallotConfig;
  expiry: Date;
  polls: Poll[];
  onError: (err: ZupollError) => void;
  setServerLoading: (loading: boolean) => void;
  loginState: LoginState;
  ballotFromUrl?: BallotFromUrl;
  pcdFromUrl?: string;
  setBallotFromUrl: (ballot?: BallotFromUrl) => void;
  setPcdFromUrl: (pcd: string) => void;
  url?: string;
}) {
  const router = useRouter();
  const pcdState = useRef<PCDState>(PCDState.DEFAULT);
  const [pcdStr, _passportPendingPCDStr] = useZupassPopupMessages();

  const {
    loading: loadingVoterGroupUrl,
    rootHash: voterGroupRootHash,
    groupUrl: voterGroupUrl
  } = useHistoricSemaphoreUrl(ballotConfig, onError);

  const submitBallot = useCallback(
    async (finalRequest: CreateBallotRequest) => {
      setServerLoading(true);
      const res = await createBallot(finalRequest, loginState.token);
      console.log(`[CREATE BALLOT res]`, res);
      setServerLoading(false);

      if (res === undefined) {
        const serverDownError: ZupollError = {
          title: "Creating ballot failed",
          message: "Server is down. Contact passport@0xparc.org."
        };
        onError(serverDownError);
        removeQueryParameters(["ballot", "proof", "finished"]);
        return;
      }

      if (!res.ok) {
        const resErr = await res.text();
        console.error("error posting vote to the server: ", resErr);
        const err: ZupollError = {
          title: "Creating ballot failed",
          message: `Server Error: ${resErr}`
        };
        onError(err);
        removeQueryParameters(["ballot", "proof", "finished"]);
        return;
      }

      router.push("/");
      setBallotFromUrl(undefined);
      setPcdFromUrl("");
    },
    [
      loginState.token,
      onError,
      router,
      setServerLoading,
      setBallotFromUrl,
      setPcdFromUrl
    ]
  );

  // only accept pcdStr if we were expecting one
  useEffect(() => {
    if (pcdState.current === PCDState.AWAITING_PCDSTR) {
      pcdState.current = PCDState.RECEIVED_PCDSTR;
    }
  }, [pcdStr]);

  // process ballot
  useEffect(() => {
    if (ballotConfig && ballotFromUrl && pcdFromUrl) {
      const parsedPcd = JSON.parse(decodeURIComponent(pcdFromUrl));
      const { ballotSignal, ballotConfig, polls } = ballotFromUrl;
      const request = generateBallotRequest({
        ballotConfig,
        ...ballotSignal,
        polls,
        voterGroupRoots: ballotSignal.voterSemaphoreGroupRoots,
        voterGroupUrls: ballotSignal.voterSemaphoreGroupUrls,
        proof: parsedPcd.pcd,
        creatorGroupUrl: ballotConfig.creatorGroupUrl
      });
      // Do request
      submitBallot(request);
      setBallotFromUrl(undefined);
      setPcdFromUrl("");
    } else {
      if (pcdState.current !== PCDState.RECEIVED_PCDSTR) return;
      if (
        voterGroupUrl == null ||
        voterGroupRootHash == null ||
        ballotConfig == null
      )
        return;
      pcdState.current = PCDState.DEFAULT;

      const parsedPcd = JSON.parse(decodeURIComponent(pcdStr));
      const finalRequest = generateBallotRequest({
        ballotTitle,
        ballotDescription,
        proof: parsedPcd.pcd,
        polls,
        ballotType: ballotConfig.ballotType,
        voterGroupRoots: [voterGroupRootHash],
        voterGroupUrls: [voterGroupUrl],
        expiry,
        creatorGroupUrl: ballotConfig.creatorGroupUrl
      });

      submitBallot(finalRequest);
    }
  }, [
    ballotDescription,
    ballotTitle,
    ballotConfig,
    expiry,
    pcdStr,
    polls,
    router,
    voterGroupRootHash,
    voterGroupUrl,
    ballotConfig?.creatorGroupUrl,
    pcdFromUrl,
    ballotFromUrl,
    setBallotFromUrl,
    setPcdFromUrl,
    submitBallot
  ]);

  // ran after ballot is submitted by user
  const createBallotPCD = useCallback(async () => {
    if (
      ballotConfig == null ||
      voterGroupUrl == null ||
      voterGroupRootHash == null
    ) {
      return onError({
        title: "Error Creating Poll",
        message: "Voter group not loaded yet."
      });
    }

    pcdState.current = PCDState.AWAITING_PCDSTR;

    const ballotSignal: BallotSignal = {
      pollSignals: [],
      ballotTitle: ballotTitle,
      ballotDescription: ballotDescription,
      ballotType: ballotConfig.ballotType,
      expiry: expiry,
      voterSemaphoreGroupUrls: [voterGroupUrl],
      voterSemaphoreGroupRoots: [voterGroupRootHash]
    };

    polls.forEach((poll: Poll) => {
      const pollSignal: PollSignal = {
        body: poll.body,
        options: poll.options
      };
      ballotSignal.pollSignals.push(pollSignal);
    });
    const signalHash = sha256(stableStringify(ballotSignal));
    const sigHashEnc = generateSnarkMessageHash(signalHash).toString();
    console.log(`[CREATED BALLOT]`, {
      ballotSignal,
      signalHash,
      sigHashEnc,
      ballotConfig
    });
    localStorage.setItem("lastBallotSignal", stableStringify(ballotSignal));
    localStorage.setItem("lastBallotSignalHash", signalHash);
    localStorage.setItem("lastBallotSignalHashEnc", sigHashEnc);
    localStorage.setItem("lastBallotConfig", stableStringify(ballotConfig));
    localStorage.setItem("lastBallotPolls", stableStringify(polls));
    const ballotUrl = `?ballot=${encodeURIComponent(
      stableStringify({
        ballotConfig,
        ballotSignal,
        polls
      })
    )}`;

    openGroupMembershipPopup(
      ballotConfig.passportAppUrl,
      window.location.origin + "/popup",
      ballotConfig.creatorGroupUrl,
      "zupoll",
      sigHashEnc,
      sigHashEnc,
      USE_CREATE_BALLOT_REDIRECT ? url + ballotUrl : undefined
    );
  }, [
    voterGroupUrl,
    voterGroupRootHash,
    ballotTitle,
    ballotDescription,
    ballotConfig,
    expiry,
    polls,
    onError,
    url
  ]);

  return { loadingVoterGroupUrl, createBallotPCD };
}
