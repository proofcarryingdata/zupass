import { EdgeCityBalance, TOTAL_SUPPLY } from "@pcd/passport-interface";
import styled from "styled-components";
import { RippleLoader } from "../../core/RippleLoader";
import { useUsernameGenerator } from "../FrogScreens/useUsername";

/**
 * The Balances tab shows the user their score and the leaderboard.
 */
export function BalancesTab({
  score,
  scores
}: {
  score?: EdgeCityBalance;
  scores: EdgeCityBalance[];
}): JSX.Element {
  const getUsername = useUsernameGenerator();

  if (scores.length === 0 || !getUsername) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderBottom: "1px solid grey",
          paddingBottom: 16,
          marginBottom: 16
        }}
      >
        <span>Total Supply</span>
        <span>{TOTAL_SUPPLY} ZUC</span>
      </div>
      {score && (
        <ScoreTable
          title="You"
          scores={[score]}
          myScore={score}
          getUsername={getUsername}
        />
      )}
      {scores.length > 0 && (
        <ScoreTable
          title={"Top holders"}
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
