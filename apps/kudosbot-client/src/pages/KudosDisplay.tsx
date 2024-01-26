import { useEffect, useState } from "react";
import SingleKudosDisplay from "../components/SingleKudosDisplay";
import { KUDOSBOT_LIST_URL } from "../constants";

const KudosDisplay = (): JSX.Element => {
  const [rawProofs, setRawProofs] = useState<string[]>([]);

  const fetchAllProofs = async (): Promise<void> => {
    const response = await fetch(KUDOSBOT_LIST_URL);
    if (response.status !== 200) {
      return;
    }
    const responseBody = await response.json();
    setRawProofs(responseBody.proofs);
  };
  useEffect(() => {
    fetchAllProofs();
  }, []);

  return (
    <>
      <h2>Kudos Display</h2>
      <p>This page shows all the kudoses made via Kudosbot.</p>
      {rawProofs.map((rawProof, idx) => (
        <SingleKudosDisplay proof={rawProof} id={idx + 1} key={idx} />
      ))}
    </>
  );
};

export default KudosDisplay;
