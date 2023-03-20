import { ZuParticipant } from "@pcd/passport-interface";
import {
  SemaphoreGroupPCDPackage,
  SemaphoreGroupPCDTypeName,
} from "@pcd/semaphore-group-pcd";
import { Buffer } from "buffer";
import { ungzip } from "pako";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext } from "../../src/dispatch";
import { ZuIdCard } from "../../src/model/Card";
import { fetchParticipant } from "../../src/participant";
import { BackgroundGlow, H3, Spacer, TextCenter } from "../core";
import { LinkButton } from "../core/Button";
import { CardElem } from "../shared/CardElem";

/** You can either prove who you are, or you can prove anonymously that you're a Zuzalu resident or visitor. */
type VerifyType = "identity-proof" | "anon-proof";

type VerifyResult =
  | { valid: false; type: VerifyType; message: string }
  | { valid: true; type: "identity-proof"; participant: ZuParticipant }
  | { valid: true; type: "anon-proof"; role: string };

export function VerifyScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);

  const params = new URLSearchParams(location.search);
  const pcdStr = params.get("pcd");
  console.log(`Verifying Zuzalu ID proof, ${pcdStr.length}b gzip+base64`);

  const [result, setResult] = useState<VerifyResult>();

  useEffect(() => {
    deserializeAndVerify(pcdStr)
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
  }, [pcdStr, setResult]);

  const [from, to] = result?.valid
    ? ["var(--bg-lite-primary)", "var(--bg-dark-primary)"]
    : ["var(--bg-lite-gray)", "var(--bg-dark-gray)"];

  const icon = {
    true: "/assets/verify-valid.svg",
    false: "/assets/verify-invalid.svg",
    undefined: "/assets/verify-in-progress.svg",
  }["" + result?.valid];

  return (
    <BackgroundGlow y={96} {...{ from, to }}>
      <Spacer h={48} />
      <TextCenter>
        <img width="90" height="90" src={icon} />
        <Spacer h={24} />
        {result == null && <H3>VERIFYING PROOF...</H3>}
        {result?.valid && <H3 col="var(--accent-dark)">PROOF VERIFIED.</H3>}
        {result?.valid === false && <H3>PROOF INVALID.</H3>}
      </TextCenter>
      <Spacer h={48} />
      <Placeholder>
        {result?.valid === false && <TextCenter>{result.message}</TextCenter>}
        {result?.valid === true && <CardElem card={getCard(result)} />}
      </Placeholder>
      {result != null && (
        <TextCenter>
          <LinkButton to="/">Back to Passport</LinkButton>
        </TextCenter>
      )}
    </BackgroundGlow>
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

const Placeholder = styled.div`
  width: 240px;
  height: 160px;
  margin: 0 auto;
`;

function ValidResultCard({ result }: { result: VerifyResult }) {
  if (!result.valid) return null;

  if (result.type === "anon-proof") {
    console.error("Anon proof verification not implemented yet");
    return null;
  }

  const card = useMemo(() => {
    return {
      id: "0x1234",
      type: "zuzalu-id",
      header: "VERIFIED ZUZALU PASSPORT",
      participant: result.participant,
    } as ZuIdCard;
  }, [result]);

  return <CardElem expanded card={card} />;
}

async function deserializeAndVerify(pcdStr: string): Promise<VerifyResult> {
  const buf = Buffer.from(pcdStr, "base64");
  console.log(`Unzipping ${buf.length}b`);
  const unzipped = Buffer.from(ungzip(buf));
  const { deserialize, verify } = SemaphoreGroupPCDPackage;
  const pcd = await deserialize(JSON.parse(unzipped.toString("utf8")).pcd);
  console.log(`Got PCD, should be a Zuzalu ID semaphore proof`, pcd);

  if (pcd.type !== SemaphoreGroupPCDTypeName) {
    throw new Error(`PCD type '${pcd.type}' is not a Zuzalu ID proof`);
  }

  const groupSize = pcd.claim.group.members.length;
  const type: VerifyType = groupSize === 1 ? "identity-proof" : "anon-proof";
  console.log(`Verifying 1-of-${groupSize} Zuzalu ${type} proof`);

  const valid = await verify(pcd);
  if (!valid) {
    return { valid: false, type: "identity-proof", message: "Invalid proof" };
  }

  // TODO: load semaphore group from server for verification
  if (type === "anon-proof") {
    // const group = fetchZuzaluGroup(pcd.claim.group.root)
    return { valid: false, type, message: "🚧 Anon verification coming soon" };
  }

  // Verify identity proof
  const commitment = pcd.claim.group.members[0];
  const participant = await fetchParticipant(commitment);
  if (participant == null) {
    return { valid: false, type, message: "Participant not found" };
  }

  return { valid: true, type, participant };
}

export const H1Center = styled.h1`
  font-size: 36px;
`;
