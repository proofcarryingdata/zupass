import { EdgeCityBalance, HAT_TOKEN_NAME } from "@pcd/passport-interface";
import styled from "styled-components";
import { RippleLoader } from "../../core/RippleLoader";
import { useUsernameGenerator } from "../FrogScreens/useUsername";

/**
 * The Score tab shows the user their score and the leaderboard.
 */
export function BalancesTab({
  score,
  scores
}: {
  score: EdgeCityBalance;
  scores: EdgeCityBalance[];
  refreshScore: () => Promise<void>;
}): JSX.Element {
  // useEffect(() => {
  //   refreshScores();
  // }, [refreshScores]);

  const getUsername = useUsernameGenerator();

  if (!score || scores.length === 0 || !getUsername) {
    return <RippleLoader />;
  }

  return (
    <Container>
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
  scores: EdgeCityBalance[];
  myScore?: EdgeCityBalance;
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
            key={score.email_hash}
            style={
              score.email_hash === myScore?.email_hash
                ? {
                    fontWeight: "bold",
                    color: "#406F3A"
                  }
                : {}
            }
          >
            <td>{score.rank}</td>
            <td>{getUsername(score.email_hash, true)}</td>
            <td style={{ textAlign: "right" }}>{score.balance.toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
`;
