import { requestFrogCryptoGetScoreboard } from "@pcd/passport-interface";
import { FrogCryptoScore } from "@pcd/passport-interface/src/FrogCrypto";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { RippleLoader } from "../../core/RippleLoader";
import { useUsernameGenerator } from "./useUsername";

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
  const getUsername = useUsernameGenerator();

  if (!score || !getUsername) {
    return <RippleLoader />;
  }

  return (
    <Container>
      <ScoreTable title="You" scores={[score]} getUsername={getUsername} />
      {scores.length > 0 && (
        <ScoreTable
          title="Leaderboard"
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
  getUsername: (semaphoreId: string) => string;
  title: string;
  scores: FrogCryptoScore[];
  myScore?: FrogCryptoScore;
}) {
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
            key={score.rank}
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
            <td>{getUsername(score.semaphore_id)}</td>
            <td style={{ textAlign: "right" }}>{score.score}</td>
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
