import {
  EdgeCityScore,
  FrogCryptoScore,
  HAT_TOKEN_NAME,
  TOTAL_SUPPLY
} from "@pcd/passport-interface";
import _ from "lodash";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { useDispatch } from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { ActionButton } from "../FrogScreens/Button";
import { useUsernameGenerator } from "../FrogScreens/useUsername";

const length = 39;
const MOCK_DATA: EdgeCityScore[] = Array.from({ length }, (_, index) => ({
  semaphore_id_hash: index.toString(),
  has_telegram_username: false,
  score: length - index, // Assuming score is a random number between 0 and 100
  rank: index
}));

/**
 * The Score tab shows the user their score and the leaderboard.
 */
export function BalancesTab({
  score,
  refreshScore
}: {
  score?: FrogCryptoScore;
  refreshScore: () => Promise<void>;
}): JSX.Element {
  const [scores, setScores] = useState<EdgeCityScore[]>(MOCK_DATA);
  const refreshScores = useCallback(async () => {
    setScores(MOCK_DATA);
    // requestFrogCryptoGetScoreboard(appConfig.zupassServer).then((res) => {
    //   setScores(res.value || []);
    // });
  }, []);
  // useEffect(() => {
  //   refreshScores();
  // }, [refreshScores]);

  const getUsername = useUsernameGenerator();

  if (!score || !getUsername) {
    return <RippleLoader />;
  }

  return (
    <Container>
      {
        // only show share button if user has a telegram username
        score.has_telegram_username && (
          <TelegramShareButton
            score={score}
            refreshAll={async (): Promise<void> => {
              Promise.all([refreshScore(), refreshScores()]);
            }}
          />
        )
      }
      <ScoreTable title="You" scores={[score]} getUsername={getUsername} />
      {scores.length > 0 && (
        <ScoreTable
          title={`$${HAT_TOKEN_NAME} Balances`}
          scores={scores}
          myScore={score}
          getUsername={getUsername}
        />
      )}
    </Container>
  );
}

function ScoreTable({
  title,
  scores,
  myScore,
  getUsername
}: {
  getUsername: (semaphoreId: string, lowercase?: boolean) => string;
  title: string;
  scores: FrogCryptoScore[];
  myScore?: FrogCryptoScore;
}): JSX.Element {
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
        {scores.map((score) => (
          <tr
            key={score.semaphore_id_hash}
            style={
              score.semaphore_id_hash === myScore?.semaphore_id_hash
                ? {
                    fontWeight: "bold",
                    color: "#406F3A"
                  }
                : {}
            }
          >
            <td>{score.rank}</td>
            <td>
              {score.telegram_username ??
                getUsername(score.semaphore_id_hash, true)}
            </td>
            <td style={{ textAlign: "right" }}>
              {(
                (score.score /
                  MOCK_DATA.map((x) => x.score).reduce((x, y) => x + y)) *
                TOTAL_SUPPLY
              ).toFixed(4)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Share button and modal for telegram username.
 */
function TelegramShareButton({
  score,
  refreshAll
}: {
  score: FrogCryptoScore;
  refreshAll: () => Promise<void>;
}): JSX.Element {
  const revealed = !!score.telegram_username;
  const dispatch = useDispatch();

  return (
    <ActionButton
      onClick={async (): Promise<void> => {
        dispatch({
          type: "set-modal",
          modal: {
            modalType: "frogcrypto-update-telegram",
            revealed,
            refreshAll
          }
        });
      }}
    >
      {score.telegram_username
        ? "Hide Telegram Username"
        : "Publish Telegram Username"}
    </ActionButton>
  );
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
  { score: 133, emoji: "🟢", title: "LEGEND" },
  { score: 256, emoji: "👑", title: "SOVEREIGN" },
  { score: 420, emoji: "🦉", title: "SAGE" },
  { score: 701, emoji: "🐸", title: "AVATAR OF FROGELION" },
  { score: 1000, emoji: "🐳️", title: "WHALE" }
];

/**
 * Returns the emoji and title for a given score.
 */
export function scoreToEmoji(score: number): string {
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
export function groupScores(scores: FrogCryptoScore[]): {
  scores: FrogCryptoScore[];
  score: number;
  emoji: string;
  title: string;
}[] {
  const groups = SCORES.map((item) => ({
    ...item,
    scores: [] as FrogCryptoScore[]
  })).reverse();

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
