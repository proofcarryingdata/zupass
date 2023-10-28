import { useEffect, useState } from "react";
import SingleKudosDisplay from "../components/SingleKudosDisplay";
import { KUDOSBOT_LIST_URL } from "../constants";

const KudosDisplay = () => {
  const [rawProofs, setRawProofs] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);

  const fetchAllProofs = async () => {
    setLoading(true);
    const response = await fetch(KUDOSBOT_LIST_URL);
    if (response.status !== 200) {
      setLoading(false);
      return;
    }
    const responseBody = await response.json();
    setLoading(false);
    setRawProofs(responseBody.proofs);
  };
  useEffect(() => {
    fetchAllProofs();
  }, []);

  return (
    <>
      <h2>Kudos Display</h2>
      <p>This page shows all the kudoses made via Kudosbot.</p>
      {isLoading && "Loading..."}
      {!isLoading && !rawProofs.length && <p>No kudoses have been made</p>}
      {!isLoading &&
        rawProofs.map((rawProof, idx) => (
          <SingleKudosDisplay proof={rawProof} id={idx + 1} key={idx} />
        ))}
    </>
  );
};

export default KudosDisplay;
