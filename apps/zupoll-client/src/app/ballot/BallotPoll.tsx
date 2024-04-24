import VoteDialog from "@/components/ui/VoteDialog";
import { BUTTON_CLASSES } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import FuzzySearch from "fuzzy-search"; // Or: var FuzzySearch = require('fuzzy-search');
import { useMemo, useState } from "react";
import styled from "styled-components";
import { ObjectOption } from "../../api/prismaTypes";
import { PollWithCounts } from "../../api/requestTypes";

type SearchItem = {
  value: string;
};

export function getOptionName(option: string): string {
  try {
    const opt = JSON.parse(option) as ObjectOption;
    return opt.text ?? option;
  } catch (e) {
    return option;
  }
}

export function BallotPoll({
  canVote,
  poll,
  voteIdx,
  finalVoteIdx,
  onVoted,
  submitVotes,
  isHackathonView,
  singlePoll,
  thisIsHackathonView
}: {
  canVote: boolean;
  poll: PollWithCounts;
  voteIdx: number | undefined;
  finalVoteIdx: number | undefined;
  onVoted: (pollId: string, voteIdx: number) => void;
  isHackathonView: boolean;
  thisIsHackathonView: boolean;
  singlePoll: boolean;
  submitVotes: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const searcher = useMemo(() => {
    const values = poll.options.map((opt) => ({ value: opt }));
    const searcher = new FuzzySearch<SearchItem>(values, ["value"], {
      caseSensitive: false,
      sort: true
    });
    return searcher;
  }, [poll.options]);

  const matchingOptions = useMemo(() => {
    if (searchTerm === "") {
      return poll.options;
    }

    const result = searcher.search(searchTerm);

    return result.map((r) => r.value);
  }, [poll.options, searchTerm, searcher]);

  const totalVotes = poll.votes.reduce((a, b) => a + b, 0);

  const getVoteDisplay = (a: number, b: number) => {
    if (b === 0) {
      return "0%";
    }
    const percentVal = ((a / b) * 100).toFixed(1);
    return `${percentVal}%`;
  };

  const [showingOptionIdx, setShowingOptionIdx] = useState<number | undefined>(
    undefined
  );

  return (
    <div>
      <VoteDialog
        show={canVote && showingOptionIdx !== undefined}
        text={poll.options[showingOptionIdx ?? 0]}
        close={() => setShowingOptionIdx(undefined)}
        submitButtonText={singlePoll ? "Submit Vote" : "Choose"}
        onVoted={() => {
          onVoted(poll.id, showingOptionIdx ?? 0);
          setShowingOptionIdx(undefined);
          if (!singlePoll) {
            submitVotes();
          }
        }}
      />
      <PollHeader>{poll.body}</PollHeader>
      {thisIsHackathonView && (
        <Input
          placeholder="Search Options"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
          type="text"
        />
      )}

      <div className="flex flex-col gap-2">
        {matchingOptions.map((opt, idx) => (
          <div
            className={cn(
              BUTTON_CLASSES,
              "select-none relative overflow-hidden bg-background p-2 flex flex-row border-2 justify-start",
              canVote
                ? "hover:bg-white/5 hover:border-foreground/50"
                : "ring-0 ring-offset-0 ring-transparent cursor-default",
              voteIdx !== undefined && poll.options[voteIdx] === opt
                ? "bg-green-100 hover:bg-green-200 border-green-500 dark:text-background hover:border-green-600"
                : ""
            )}
            key={opt}
            onClick={() => {
              if (thisIsHackathonView && canVote) {
                setShowingOptionIdx(poll.options.indexOf(opt));
              } else if (canVote) {
                onVoted(poll.id, idx);
              }
            }}
          >
            <div
              className={cn(
                "z-[1] absolute top-0 left-0 h-full",
                finalVoteIdx === idx ? "bg-green-500" : "bg-green-400"
              )}
              style={{
                width: `${
                  totalVotes === 0 || canVote
                    ? 0
                    : (poll.votes[idx] / totalVotes) * 100
                }%`
              }}
            />
            {canVote ? (
              <PollPreResult></PollPreResult>
            ) : (
              <PollResult className="">
                {getVoteDisplay(poll.votes[idx], totalVotes)}
              </PollResult>
            )}
            <OptionString>{getOptionName(opt)}</OptionString>
          </div>
        ))}
      </div>
      <div className="mt-2">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

const PollHeader = styled.div`
  padding: 0px;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PollPreResult = styled.span`
  z-index: 2;
  width: 0.5rem;
  position: relative;
`;

const PollResult = styled.span`
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  display: inline-flex;
  justify-content: flex-end;
  padding-right: 0.5rem;
  align-items: center;
  font-weight: bold;
  width: 3.5rem;
  font-size: 0.9em;
`;

const OptionString = styled.span`
  position: relative;
  z-index: 2;
  padding-left: 1rem;
  overflow: hidden;
  white-space: normal;
`;
