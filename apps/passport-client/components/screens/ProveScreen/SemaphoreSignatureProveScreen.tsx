import {
  ISSUANCE_STRING,
  PCDGetRequest,
  postPendingPCDMessage,
  ProveOptions,
  requestProveOnServer,
  SignInMessagePayload
} from "@pcd/passport-interface";
import { ErrorContainer } from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  IdentityV3,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import cloneDeep from "lodash/cloneDeep";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useIdentityV3, useSelf } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { getHost, getOrigin, nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";

export function SemaphoreSignatureProveScreen({
  req
}: {
  req: PCDGetRequest<typeof SemaphoreSignaturePCDPackage>;
}): JSX.Element {
  // Create a zero-knowledge proof using the identity in DispatchContext
  const self = useSelf();
  const identity = useIdentityV3();
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

    if (!self) {
      setError("User data is not available");
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
        if (window.opener && req.postMessage) {
          postPendingPCDMessage(window.opener, pendingPCDResult.value);
          window.close();
        }
        safeRedirectPending(req.returnUrl, pendingPCDResult.value);
      } else {
        setError(pendingPCDResult.error);
      }
    } else {
      const { prove, serialize } = SemaphoreSignaturePCDPackage;
      const pcd = await prove(args);
      const serializedPCD = await serialize(pcd);
      setProving(false);
      if (window.opener && req.postMessage) {
        window.opener.postMessage({ encodedPCD: serializedPCD }, "*");
        window.close();
      }
      safeRedirect(req.returnUrl, serializedPCD);
    }
  }, [identity, req.args, req.options, req.postMessage, req.returnUrl, self]);

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
  identityV3: IdentityV3,
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
        await SemaphoreIdentityPCDPackage.prove({ identityV3 })
      )
    }
  };

  return args;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
