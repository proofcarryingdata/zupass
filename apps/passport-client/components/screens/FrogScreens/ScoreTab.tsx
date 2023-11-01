import { requestFrogCryptoGetScoreboard } from "@pcd/passport-interface";
import { FrogCryptoScore } from "@pcd/passport-interface/src/FrogCrypto";
import { useEffect, useState } from "react";
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
      {scores.length > 0 && <ScoreTable title="Leaderboard" scores={scores} />}
    </Container>
  );
}

function ScoreTable({
  title,
  scores
}: {
  title: string;
  scores: FrogCryptoScore[];
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
          <tr key={score.rank}>
            <td>{score.rank}</td>
            <td>{score.telegram_username || "An Unnamed Toad"}</td>
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
