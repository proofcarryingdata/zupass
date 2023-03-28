import { fetchParticipant, ZuParticipant } from "@pcd/passport-interface";
import {
  SemaphoreSignaturePCDPackage,
  SemaphoreSignaturePCDTypeName,
} from "@pcd/semaphore-signature-pcd";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { config } from "../../src/config";
import { ZuzaluQRPayload } from "../../src/createZuzaluQRProof";
import { DispatchContext } from "../../src/dispatch";
import { ZuIdCard } from "../../src/model/Card";
import { decodeQRPayload } from "../../src/qr";
import { bigintToUuid } from "../../src/util";
import {
  BackgroundGlow,
  CenterColumn,
  H4,
  Placeholder,
  Spacer,
  TextCenter,
} from "../core";
import { LinkButton } from "../core/Button";
import { icons } from "../icons";
import { AppContainer } from "../shared/AppContainer";
import { CardElem } from "../shared/CardElem";

/** You can either prove who you are, or you can prove anonymously that you're a Zuzalu resident or visitor. */
type VerifyType = "identity-proof" | "anon-proof";

type VerifyResult =
  | { valid: false; type: VerifyType; message: string }
  | { valid: true; type: "identity-proof"; participant: ZuParticipant }
  | { valid: true; type: "anon-proof"; role: string };

// Shows whether a proof is valid. On success, shows the PCD claim visually.
export function VerifyScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);

  const params = new URLSearchParams(location.search);
  const encodedQRPayload = params.get("pcd");
  console.log(
    `Verifying Zuzalu ID proof, ${encodedQRPayload.length}b gzip+base64`
  );

  const [result, setResult] = useState<VerifyResult>();

  useEffect(() => {
    deserializeAndVerify(encodedQRPayload)
      .then((res: VerifyResult) => {
        console.log("Verification result", res);
        setResult(res);
      })
      .catch((err: Error) => {
        console.error(err);
        dispatch({
          type: "error",
          error: {
            title: "Verification error",
            message: err.message,
            stack: err.stack,
          },
        });
      });
  }, [encodedQRPayload, setResult, dispatch]);

  const [from, to, bg]: [string, string, "primary" | "gray"] = result?.valid
    ? ["var(--bg-lite-primary)", "var(--bg-dark-primary)", "primary"]
    : ["var(--bg-lite-gray)", "var(--bg-dark-gray)", "gray"];

  const icon = {
    true: icons.verifyValid,
    false: icons.verifyInvalid,
    undefined: icons.verifyInProgress,
  }["" + result?.valid];

  return (
    <AppContainer bg={bg}>
      <BackgroundGlow y={96} {...{ from, to }}>
        <Spacer h={48} />
        <TextCenter>
          <img width="90" height="90" src={icon} />
          <Spacer h={24} />
          {result == null && <H4>VERIFYING PROOF...</H4>}
          {result?.valid && <H4 col="var(--accent-dark)">PROOF VERIFIED.</H4>}
          {result?.valid === false && <H4>PROOF INVALID.</H4>}
        </TextCenter>
        <Spacer h={48} />
        <Placeholder minH={160}>
          {result?.valid === false && <TextCenter>{result.message}</TextCenter>}
          {result?.valid === true && (
            <CardElem expanded card={getCard(result)} />
          )}
        </Placeholder>
        <Spacer h={64} />
        {result != null && (
          <CenterColumn w={280}>
            <LinkButton to="/scan">Verify another</LinkButton>
            <Spacer h={8} />
            <LinkButton to="/">Back to Passport</LinkButton>
            <Spacer h={24} />
          </CenterColumn>
        )}
      </BackgroundGlow>
    </AppContainer>
  );
}

function getCard(result: VerifyResult): ZuIdCard {
  if (!result.valid) throw new Error("Invalid proof");
  if (result.type !== "identity-proof") throw new Error("Not an ID proof");
  return {
    id: "0x1234",
    type: "zuzalu-id",
    header: "VERIFIED ZUZALU PASSPORT",
    participant: result.participant,
  };
}

async function deserializeAndVerify(pcdStr: string): Promise<VerifyResult> {
  const { deserialize, verify } = SemaphoreSignaturePCDPackage;
  const decodedPCD = decodeQRPayload(pcdStr);
  const deserializedPCD = await deserialize(JSON.parse(decodedPCD).pcd);
  console.log(
    `Got PCD, should be a Zuzalu ID semaphore proof`,
    deserializedPCD
  );

  if (deserializedPCD.type !== SemaphoreSignaturePCDTypeName) {
    throw new Error(
      `PCD type '${deserializedPCD.type}' is not a Zuzalu ID proof`
    );
  }

  const valid = await verify(deserializedPCD);
  if (!valid) {
    return { valid: false, type: "identity-proof", message: "Invalid proof" };
  }

  // Verify identity proof
  const payload = JSON.parse(
    deserializedPCD.claim.signedMessage
  ) as ZuzaluQRPayload;

  const uuid = bigintToUuid(BigInt(payload.uuid));
  const participant = await fetchParticipant(config.passportServer, uuid);

  if (participant == null) {
    return {
      valid: false,
      type: "identity-proof",
      message: "Participant not found",
    };
  }

  if (participant.commitment !== deserializedPCD.claim.identityCommitment) {
    return {
      valid: false,
      type: "identity-proof",
      message: "Participant doesn't match proof",
    };
  }

  const timeDifferenceMs = Date.now() - payload.timestamp;

  if (timeDifferenceMs >= config.maxProofAge) {
    return {
      valid: false,
      type: "identity-proof",
      message: "Proof expired",
    };
  }

  return { valid: true, type: "identity-proof", participant };
}
