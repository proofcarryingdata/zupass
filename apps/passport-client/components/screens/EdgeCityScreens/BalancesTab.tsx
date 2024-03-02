import { EdgeCityBalance, TOTAL_SUPPLY } from "@pcd/passport-interface";
import styled from "styled-components";
import { RippleLoader } from "../../core/RippleLoader";
import { useUsernameGenerator } from "../FrogScreens/useUsername";

/**
 * The Balances tab shows the user their score and the leaderboard.
 */
export function BalancesTab({
  score,
  scores,
  totalExp
}: {
  score?: EdgeCityBalance;
  scores: EdgeCityBalance[];
  totalExp: number;
}): JSX.Element {
  const getUsername = useUsernameGenerator();

  if (scores.length === 0 || !getUsername) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <TopSection>
        <Spread>
          <span>total supply</span>
          <span>{TOTAL_SUPPLY} ZUC</span>
        </Spread>
        <Spread>
          <span>global EXP</span>
          <span>{totalExp.toFixed(1)} EXP</span>
        </Spread>
        <Spread>
          <span>EXP/ZUC</span>
          <span>{(TOTAL_SUPPLY / totalExp).toFixed(3)}</span>
        </Spread>
        {score && (
          <Spread>
            <span>your EXP</span>
            <span>{(score.exp ?? 0).toFixed(1)}&nbsp;EXP</span>
          </Spread>
        )}
        {score && (
          <Spread>
            <span>your slice of $ZUC</span>
            <span>{((score.exp / totalExp) * 100).toFixed(3)}%</span>
          </Spread>
        )}
      </TopSection>

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

const Spread = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16;
`;

const TopSection = styled.div`
  padding-top: 16px;
  padding-bottom: 16px;
  border-top: 1px solid grey;
  border-bottom: 1px solid grey;
`;
