import { PCDGetRequest } from "@pcd/passport-interface";
import { ArgumentTypeName, StringArgument } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { ReactNode, useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { Button } from "../../core";

export function SemaphoreSignatureProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreSignaturePCDPackage>;
}) {
  // Create a zero-knowledge proof using the identity in DispatchContext
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);
  const onProve = useCallback(async () => {
    setProving(true);

    const serializedPCD = await prove(state.identity!, req.args.signedMessage);

    // Redirect back to requester
    window.location.href = `${req.returnUrl}?proof=${JSON.stringify(
      serializedPCD
    )}`;
  }, []);

  const lines: ReactNode[] = [];
  lines.push(
    <p>
      Signing message: <b>{req.args.signedMessage.value}</b>
    </p>
  );
  lines.push(<Button onClick={onProve}>Prove</Button>);
  if (proving) {
    lines.push(<p>Proving...</p>);
  }

  return (
    <div>
      {lines.map((line, i) => (
        <LineWrap key={i}>{line}</LineWrap>
      ))}
    </div>
  );
}

async function prove(identity: Identity, signedMessage: StringArgument) {
  const { prove, serialize } = SemaphoreSignaturePCDPackage;

  const args: SemaphoreSignaturePCDArgs = {
    signedMessage,
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  console.log("Proving semaphore signature", args);
  console.log("Message", signedMessage.value);
  console.log("Identity", identity.commitment.toString());

  const pcd = await prove(args);
  const serialized = await serialize(pcd);
  console.log("Proof complete", serialized);

  return serialized;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
