import { requestFrogCryptoGetScoreboard } from "@pcd/passport-interface";
import { FrogCryptoScore } from "@pcd/passport-interface/src/FrogCrypto";
import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { RippleLoader } from "../../core/RippleLoader";

/**
 * The Score tab shows the user their score and the leaderboard.
 */
export function ScoreTab({ score }: { score?: FrogCryptoScore }) {
  const [scores, setScores] = useState<FrogCryptoScore[]>([]);
  useEffect(() => {
    requestFrogCryptoGetScoreboard(appConfig.zupassServer).then((res) => {
      setScores(res.value || []);
    });
  }, []);

  if (!score) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <ScoreTable title="You" scores={[score]} />
      {scores.length > 0 && (
        <ScoreTable title="Leaderboard" scores={scores} myScore={score} />
      )}
    </Container>
  );
}

function ScoreTable({
  title,
  scores,
  myScore
}: {
  title: string;
  scores: FrogCryptoScore[];
  myScore?: FrogCryptoScore;
}) {
  const scoresByLevel = useMemo(() => groupScores(scores), [scores]);

  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: "35px" }}></th>
          <th style={{ textAlign: "center" }}></th>
          <th style={{ width: "100px" }}></th>
        </tr>
        <tr>
          <th colSpan={3} style={{ textAlign: "center" }}>
            {title}
          </th>
        </tr>
      </thead>
      <tbody>
        {scoresByLevel.map((group) => {
          return (
            <>
              {myScore && (
                <tr key={group.title}>
                  <td
                    colSpan={3}
                    style={{ textAlign: "center", padding: "4px 0" }}
                  >
                    {group.emoji} {group.title}
                  </td>
                </tr>
              )}

              {group.scores.map((score) => (
                <tr
                  key={score.semaphore_id}
                  style={
                    score.semaphore_id === myScore?.semaphore_id
                      ? {
                          fontWeight: "bold",
                          color: "var(--accent-darker)"
                        }
                      : {}
                  }
                >
                  <td>{score.rank}</td>
                  <td>{getUserShortId(score.semaphore_id)}</td>
                  <td style={{ textAlign: "right" }}>{score.score}</td>
                </tr>
              ))}
            </>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Returns a short username for a given semaphore id.
 *
 * TODO: replace with an unique username generator instead
 */
function getUserShortId(id: string) {
  const hexString = Buffer.from(id, "utf8").toString("hex");
  return `0x${hexString.slice(0, 4)}...${hexString.slice(-4)}`;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
`;

/**
 * The score thresholds for each level.
 */
export const SCORES = [
  { score: 0, emoji: "⚪️", title: "NOVICE" },
  { score: 5, emoji: "🟡", title: "APPRENTICE" },
  { score: 10, emoji: "🟠", title: "JOURNEYMAN" },
  { score: 19, emoji: "🔴", title: "EXPERT" },
  { score: 36, emoji: "🟣", title: "MASTER" },
  { score: 69, emoji: "🔵", title: "GRANDMASTER" },
  { score: 133, emoji: "🟢", title: "LEGEND" }
];

/**
 * Returns the emoji and title for a given score.
 */
export function scoreToEmoji(score: number) {
  const index = SCORES.findIndex((item) => item.score > score);
  if (index === -1) {
    return `${SCORES[SCORES.length - 1].emoji} ${
      SCORES[SCORES.length - 1].title
    }`;
  }
  const curr = SCORES[index - 1];
  const next = SCORES[index];
  const percent = Math.floor(
    ((score - curr.score) / (next.score - curr.score)) * 100
  );
  return `${curr.emoji} ${curr.title} - ${percent}%`;
}

/**
 * Group the scores by level.
 */
export function groupScores(scores: FrogCryptoScore[]) {
  const groups = SCORES.map((item) => ({ ...item, scores: [] })).reverse();

  _.orderBy(scores, ["score"], ["desc"]).forEach((score) => {
    const index = SCORES.findIndex((item) => item.score > score.score);
    const curr = SCORES[index === -1 ? SCORES.length - 1 : index - 1];

    const group = groups.find((item) => item.title === curr.title);
    if (!group) {
      return;
    }
    group.scores.push(score);
  });

  return groups.filter((group) => group.scores.length > 0);
}
