import { useSemaphoreSignatureProof } from "@pcd/passport-interface";
import { useState } from "react";
import { CollapsableCode } from "./Core";

const SingleKudosDisplay = (props: {
  proof: string;
  id: number;
}): JSX.Element => {
  const [signatureProofValid, setSignatureProofValid] = useState<
    boolean | undefined
  >();
  const { signatureProof } = useSemaphoreSignatureProof(
    props.proof,
    (valid) => {
      setSignatureProofValid(valid);
    }
  );

  const deserializeKudosData = (
    kudosData: string
  ): { giver: string; receiver: string } | null => {
    const kudosDataArr = kudosData.split(":");
    if (kudosDataArr.length !== 3 || kudosDataArr[0] !== "KUDOS") {
      return null;
    }
    return { giver: kudosDataArr[1], receiver: kudosDataArr[2] };
  };

  const kudosData =
    signatureProof && deserializeKudosData(signatureProof.claim.signedMessage);

  return (
    <>
      {signatureProof != null && (
        <>
          <p>Kudosbot Proof {props.id}</p>
          <p>{`Kudos giver: ${kudosData.giver}`}</p>
          <p>{`Kudos receiver: ${kudosData.receiver}`}</p>{" "}
          {signatureProofValid === undefined && <p>❓ Proof verifying</p>}
          {signatureProofValid === false && <p>❌ Proof is invalid</p>}
          {signatureProofValid === true && <p>✅ Proof is valid</p>}
          <CollapsableCode
            label="PCD Proof"
            code={JSON.stringify(signatureProof, null, 2)}
          />
        </>
      )}
    </>
  );
};

export default SingleKudosDisplay;
