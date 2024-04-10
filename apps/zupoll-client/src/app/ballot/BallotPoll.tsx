import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import FuzzySearch from "fuzzy-search"; // Or: var FuzzySearch = require('fuzzy-search');
import { useMemo, useState } from "react";
import styled, { css } from "styled-components";
import { PollWithCounts } from "../../api/requestTypes";
import { BallotOptionModal } from "./BallotOptionModal";

type SearchItem = {
  value: string;
};

export function BallotPoll({
  canVote,
  poll,
  voteIdx,
  finalVoteIdx,
  onVoted
}: {
  canVote: boolean;
  poll: PollWithCounts;
  voteIdx: number | undefined;
  finalVoteIdx: number | undefined;
  onVoted: (pollId: string, voteIdx: number) => void;
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

  const [showingOption, setShowingOption] = useState<string | undefined>(
    undefined
  );

  const isHackathonView = poll.options.length > 6;

  return (
    <>
      {showingOption && (
        <BallotOptionModal close={() => setShowingOption(undefined)} />
      )}
      <Card className="pt-6">
        <CardContent>
          <PollHeader>{poll.body}</PollHeader>
          {isHackathonView && (
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
              type="text"
            />
          )}

          <PollOptions>
            {matchingOptions.map((opt, idx) => (
              <PollOption
                key={idx}
                canVote={canVote}
                selected={voteIdx === idx}
                onClick={() => {
                  if (isHackathonView) {
                    setShowingOption(opt);
                  } else if (canVote) {
                    onVoted(poll.id, idx);
                  }
                }}
              >
                <PollProgressBar
                  percent={
                    totalVotes === 0 || canVote
                      ? 0
                      : poll.votes[idx] / totalVotes
                  }
                  isHighlighted={finalVoteIdx === idx}
                />
                {canVote ? (
                  <PollPreResult />
                ) : (
                  <PollResult>
                    {getVoteDisplay(poll.votes[idx], totalVotes)}
                  </PollResult>
                )}
                <OptionString>{opt}</OptionString>
              </PollOption>
            ))}
          </PollOptions>
          <TotalVotesContainer>
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </TotalVotesContainer>
        </CardContent>
      </Card>
    </>
  );
}

const PollWrapper = styled.div`
  box-sizing: border-box;
  font-family: OpenSans;
  border: 1px solid #bbb;
  background-color: #eee;
  width: 100%;
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 1.5rem;
  position: relative;
  transition: 200ms;

  &:hover {
    background-color: #f8f8f8;
  }
`;

const PollHeader = styled.div`
  padding: 0px;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PollOptions = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  list-style-type: none;
  gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
`;

const PollOption = styled.span<{ canVote: boolean; selected: boolean }>`
  ${({ canVote, selected }) => css`
    overflow: hidden;
    position: relative;
    padding: 0.5rem 0.5rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 0.5rem;
    width: 100%;
    box-sizing: border-box;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-direction: row;
    gap: 0.5rem;
    border: 1px solid transparent;

    ${canVote &&
    css`
      &:hover {
        cursor: pointer;
        border: 1px solid #888;
        background-color: #ddd;
      }

      &:hover:active {
        background-color: #ccc;
      }
    `}

    ${selected &&
    css`
      border: 1px solid #888;
      background-color: #aaa;
    `}
  `}
`;

const PollProgressBar = styled.span<{
  percent: number;
  isHighlighted: boolean;
}>`
  ${({ percent, isHighlighted }) => css`
    position: absolute;
    top: 0;
    left: 0;
    width: ${100 * percent}%;
    height: 100%;
    background-color: ${isHighlighted ? "#90ccf1" : "#cce5f3"};
  `}
`;

const PollPreResult = styled.span`
  width: 0.5rem;
`;

const PollResult = styled.span`
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  font-weight: bold;
  width: 4rem;
  font-size: 0.9em;
`;

const OptionString = styled.span``;

const TotalVotesContainer = styled.div`
  margin-top: 0.75rem;
  color: #666;
  font-size: 0.9em;
`;
