import ErrorDialog from "@/components/ui/ErrorDialog";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Center, ContentContainer } from "../../@/components/ui/Elements";
import { AppHeader, SubpageActions } from "../../@/components/ui/Headers";
import { Title } from "../../@/components/ui/text";
import { Ballot } from "../../api/prismaTypes";
import { BallotPollResponse, PollWithCounts } from "../../api/requestTypes";
import { LoginState, ZupollError } from "../../types";
import { fmtTimeAgo, fmtTimeFuture } from "../../util";
import { listBallotPolls } from "../../zupoll-server-api";
import { BallotPoll } from "./BallotPoll";
import { getBallotVotes, useBallotVoting, votedOn } from "./useBallotVoting";

export function BallotScreen({
  ballotURL,
  loginState,
  logout
}: {
  ballotURL: string;
  loginState: LoginState;
  logout: (ballotURL?: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<ZupollError>();
  const [serverLoading, setServerLoading] = useState<boolean>(false);

  /**
   * BALLOT/POLL LOGIC
   */
  const [loadingPolls, setLoadingPolls] = useState<boolean>(false);
  const [polls, setPolls] = useState<Array<PollWithCounts>>([]);
  const [ballot, setBallot] = useState<Ballot>();
  const [ballotId, setBallotId] = useState<string>("");
  const [ballotVoterSemaphoreGroupUrl, setBallotVoterSemaphoreGroupUrl] =
    useState<string>("");
  const [expired, setExpired] = useState<boolean>(false);
  const [refresh, setRefresh] = useState<string>("");
  const [pcdFromUrl, setPcdFromUrl] = useState<any>();
  const [voteFromUrl, setVoteFromUrl] = useState<{
    polls: PollWithCounts[];
    pollToVote: Map<string, number | undefined>;
  }>();

  // Retrieve polls under this ballot, refresh after user votes
  useEffect(() => {
    async function getBallotPolls() {
      setLoadingPolls(true);
      const res = await listBallotPolls(loginState.token, ballotURL);
      setLoadingPolls(false);

      if (res === undefined) {
        const serverDownError: ZupollError = {
          title: "Retrieving polls failed",
          message: "Server is down. Contact support@zupass.org."
        };
        setError(serverDownError);
        return;
      }

      if (res.status === 403) {
        logout(ballotURL);
        return;
      }

      if (!res.ok) {
        const resErr = await res.text();
        console.error("error posting vote to the server: ", resErr);
        const err: ZupollError = {
          title: "Retreiving polls failed",
          message: `Server Error: ${resErr}`
        };
        setError(err);
        return;
      }

      const ballotPollResponse: BallotPollResponse = await res.json();
      console.log(ballotPollResponse);

      // reorder+reformat polls if there's a poll order in the options
      if (ballotPollResponse.polls.length > 0) {
        const firstPollOptions = ballotPollResponse.polls[0].options;
        if (
          firstPollOptions[firstPollOptions.length - 1].startsWith(
            "poll-order-"
          )
        ) {
          const newPolls: PollWithCounts[] = [];

          // Sorting polls by poll-order-<idx> option
          for (let idx = 0; idx < ballotPollResponse.polls.length; idx++) {
            for (let i = 0; i < ballotPollResponse.polls.length; i++) {
              const poll = ballotPollResponse.polls[i];
              const lastOption = poll.options[poll.options.length - 1];
              if (lastOption === `poll-order-${idx}`) {
                newPolls.push(poll);
                break;
              }
            }
          }

          // Remove poll-order-<idx> option from polls
          for (let i = 0; i < newPolls.length; i++) {
            newPolls[i].options.pop();
          }
          setPolls(newPolls);
        } else {
          setPolls(ballotPollResponse.polls);
        }
      } else {
        console.error("No polls found in ballot");
        const err: ZupollError = {
          title: "Retreiving polls failed",
          message: `No polls found in ballot`
        };
        setError(err);
        return;
      }

      setBallot(ballotPollResponse.ballot);
      setBallotId(ballotPollResponse.ballot.ballotId);
      setBallotVoterSemaphoreGroupUrl(
        ballotPollResponse.ballot.voterSemaphoreGroupUrls[0]
      );
      setExpired(new Date(ballotPollResponse.ballot.expiry) < new Date());
    }

    getBallotPolls();
  }, [ballotURL, refresh, loginState, router, logout]);

  /**
   * VOTING LOGIC
   */
  useEffect(() => {
    const url = new URL(window.location.href);
    // Use URLSearchParams to get the proof query parameter
    const proofString = url.searchParams.get("proof");
    const voteString = url.searchParams.get("vote");
    if (proofString && voteString) {
      const voteStr = JSON.parse(voteString) as {
        polls: PollWithCounts[];
        pollToVoteJSON: [string, number | undefined][];
      };
      const vote = {
        polls: voteStr.polls,
        pollToVote: new Map(voteStr.pollToVoteJSON)
      };

      const decodedProofString = decodeURIComponent(proofString);
      // Parse the decoded string into an object
      setVoteFromUrl(vote);
      setPcdFromUrl(decodedProofString);
    }
  }, []);

  const [canVote, setCanVote] = useState<boolean>(true);
  const [pollToVote, setPollToVote] = useState(
    new Map<string, number | undefined>()
  );

  // check voting status
  useEffect(() => {
    setCanVote(!votedOn(ballotId) && !expired);
  }, [expired, ballotId, refresh]);

  // update votes for polls
  const onVoted = (pollId: string, voteIdx: number) => {
    const currentVote = pollToVote.get(pollId);
    if (currentVote !== undefined) {
      if (currentVote === voteIdx) {
        setPollToVote(new Map(pollToVote.set(pollId, undefined)));
        return;
      }
    }
    setPollToVote(new Map(pollToVote.set(pollId, voteIdx)));
  };

  const createBallotVotePCD = useBallotVoting({
    ballotId,
    ballotURL,
    ballotVoterSemaphoreGroupUrl,
    polls,
    pollToVote,
    voteFromUrl,
    pcdFromUrl,
    onError: (err: ZupollError) => {
      setError(err);
      setServerLoading(false);
    },
    setServerLoading,
    refresh: (id: string) => {
      setPollToVote(new Map());
      setRefresh(id);
    },
    loginState,
    returnUrl: window.location.href, // If exists, will use returnUrl instead of pop up to get PCD.
    setPcdFromUrl,
    setVoteFromUrl
  });

  return (
    <ScreenContainer>
      <Center>
        <AppHeader title={" "} actions={<SubpageActions />} />
        <ContentContainer>
          {ballot && polls && (
            <div>
              <Title className="mb-0">{ballot.ballotTitle} </Title>
              <span className="font-normal text-sm text-foreground/90">
                posted {fmtTimeAgo(new Date(ballot.createdAt))}
                {" · "}
                {new Date(ballot.expiry) < new Date() ? (
                  <span className="text-red-600 dark:text-red-300">
                    expired
                  </span>
                ) : (
                  <>expires {fmtTimeFuture(new Date(ballot.expiry))}</>
                )}
              </span>
              <p className="mt-2">{ballot.ballotDescription}</p>
              <div className="flex flex-col gap-4 mb-4">
                {polls.map((poll) => (
                  <BallotPoll
                    key={poll.id}
                    canVote={canVote}
                    poll={poll}
                    voteIdx={pollToVote.get(poll.id)}
                    finalVoteIdx={getBallotVotes(ballotId)[poll.id]}
                    onVoted={onVoted}
                    submitVotes={() => {
                      if (polls.length < 2) {
                        createBallotVotePCD();
                      }
                    }}
                  />
                ))}
              </div>

              {canVote && (
                <>
                  <Button
                    variant={"creative"}
                    onClick={createBallotVotePCD}
                    className="w-full"
                  >
                    Submit Votes
                  </Button>
                  <TextContainer className="text-foreground/70 mt-2 text-center">
                    If you created or reset your Zupass after this ballot was
                    created you will not be able to vote. This is a security
                    measure designed to prevent double-voting.
                  </TextContainer>
                </>
              )}
            </div>
          )}

          {(!ballot || !polls) && <PlaceholderBallot />}

          <ErrorDialog
            error={error}
            close={() => {
              setError(undefined);
            }}
          />
        </ContentContainer>
      </Center>
    </ScreenContainer>
  );
}

const TextContainer = styled.div`
  display: flex;
  gap: 1rem;
  font-size: 1rem;
  margin-bottom: 1.5rem;
`;

function PlaceholderBallot() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-8 w-[60%]" />
      <div className="flex flex-row gap-2">
        <Skeleton className="h-5 w-[100px]" />
        <Skeleton className="h-5 w-[100px]" />
      </div>
      <Skeleton className="h-5 w-[200px]" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-7 w-full" />
    </div>
  );
}
