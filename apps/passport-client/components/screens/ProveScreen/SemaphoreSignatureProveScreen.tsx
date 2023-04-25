import { PCDGetRequest, ProveRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { cloneDeep } from "lodash";
import { ReactNode, useCallback, useContext, useState } from "react";
import styled from "styled-components";
import { requestPendingPCD } from "../../../src/api/requestPendingPCD";
import { DispatchContext } from "../../../src/dispatch";
import {
  safeRedirect,
  safeRedirectPending,
} from "../../../src/passportRequest";
import { getReferrerHost, nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";

export function SemaphoreSignatureProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreSignaturePCDPackage>;
}) {
  // Create a zero-knowledge proof using the identity in DispatchContext
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);
  const onProve = useCallback(async () => {
    try {
      setProving(true);

      // Give the UI has a chance to update to the 'loading' state before the
      // potentially blocking proving operation kicks off
      await nextFrame();

      const modifiedArgs = cloneDeep(req.args);
      const args = await fillArgs(
        state.identity,
        state.self.uuid,
        modifiedArgs
      );

      if (req.options?.proveOnServer === true) {
        const serverReq: ProveRequest = {
          pcdType: SemaphoreSignaturePCDPackage.name,
          args: args,
        };
        const pendingPCD = await requestPendingPCD(serverReq);
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else {
        const { prove, serialize } = SemaphoreSignaturePCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        safeRedirect(req.returnUrl, serializedPCD);
      }
    } catch (e) {
      console.log(e);
    }
  }, [req, state.identity, state.self?.uuid]);

  const lines: ReactNode[] = [];

  if (req.args.signedMessage.value === undefined) {
    // Website is asking for a signature of the Zuzalu UUID for auth
    lines.push(
      <p>
        <b>{getReferrerHost()}</b> will receive your name, your email, and your
        Semaphore public key.
      </p>
    );

    if (!proving) {
      lines.push(<Button onClick={onProve}>Continue</Button>);
    } else {
      lines.push(<RippleLoader />);
    }
  } else {
    // Website is asking for a signature of a custom message
    lines.push(
      <p>
        Signing message: <b>{req.args.signedMessage.value}</b>
      </p>
    );
    if (!proving) {
      lines.push(<Button onClick={onProve}>Prove</Button>);
    } else {
      lines.push(<RippleLoader />);
    }
  }

  return (
    <div>
      {lines.map((line, i) => (
        <LineWrap key={i}>{line}</LineWrap>
      ))}
    </div>
  );
}

async function fillArgs(
  identity: Identity,
  uuid: string,
  modifiedArgs: SemaphoreSignaturePCDArgs
): Promise<SemaphoreSignaturePCDArgs> {
  const signedMessage = modifiedArgs.signedMessage;

  if (signedMessage.value === undefined) {
    console.log("undefined message to sign, setting it to", uuid);
    signedMessage.value = uuid;
  }

  const args: SemaphoreSignaturePCDArgs = {
    signedMessage,
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  return args;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
