import {
  ISSUANCE_STRING,
  PCDGetRequest,
  ProveOptions,
  requestProveOnServer,
  SignInMessagePayload
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { cloneDeep } from "lodash";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useIdentity, useSelf } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { getHost, getOrigin, nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { ErrorContainer } from "../../core/error";
import { RippleLoader } from "../../core/RippleLoader";

export function SemaphoreSignatureProveScreen({
  req
}: {
  req: PCDGetRequest<typeof SemaphoreSignaturePCDPackage>;
}): JSX.Element {
  // Create a zero-knowledge proof using the identity in DispatchContext
  const self = useSelf();
  const identity = useIdentity();
  const [proving, setProving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onProve = useCallback(async () => {
    setProving(true);

    // Give the UI has a chance to update to the 'loading' state before the
    // potentially blocking proving operation kicks off
    await nextFrame();

    if (req.args.signedMessage.value === ISSUANCE_STRING) {
      setError("Can't sign this message");
      setProving(false);
      return;
    }

    const args = await fillArgs(
      identity,
      self.uuid,
      cloneDeep(req.args),
      req.returnUrl,
      req.options
    );

    if (req.options?.proveOnServer === true) {
      const pendingPCDResult = await requestProveOnServer(
        appConfig.zupassServer,
        {
          pcdType: SemaphoreSignaturePCDPackage.name,
          args: args
        }
      );

      setProving(false);

      if (pendingPCDResult.success) {
        safeRedirectPending(req.returnUrl, pendingPCDResult.value);
      } else {
        setError(pendingPCDResult.error);
      }
    } else {
      const { prove, serialize } = SemaphoreSignaturePCDPackage;
      const pcd = await prove(args);
      const serializedPCD = await serialize(pcd);
      setProving(false);
      safeRedirect(req.returnUrl, serializedPCD);
    }
  }, [identity, req.args, req.options, req.returnUrl, self.uuid]);

  const lines: ReactNode[] = [];

  if (req.args.signedMessage.value === undefined) {
    // Website is asking for a signature of the Zuzalu UUID for auth
    lines.push(
      <p>
        <b>{getHost(req.returnUrl)}</b> will receive your name, your email, and
        your Semaphore public key.
      </p>
    );

    if (error) {
      lines.push(<ErrorContainer>{error}</ErrorContainer>);
    } else if (!proving) {
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

    if (error) {
      lines.push(<ErrorContainer>{error}</ErrorContainer>);
    } else if (!proving) {
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
  modifiedArgs: SemaphoreSignaturePCDArgs,
  returnURL: string,
  options?: ProveOptions
): Promise<SemaphoreSignaturePCDArgs> {
  const signedMessage = modifiedArgs.signedMessage;

  if (options?.signIn) {
    console.log("this signature request is for signing into a website", uuid);
    const payload: SignInMessagePayload = {
      uuid,
      referrer: getOrigin(returnURL)
    };
    signedMessage.value = JSON.stringify(payload);
  } else if (signedMessage.value === undefined) {
    // @todo: deprecate this condition
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
      )
    }
  };

  return args;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
