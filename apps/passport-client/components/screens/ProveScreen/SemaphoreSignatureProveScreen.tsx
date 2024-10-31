import {
  ISSUANCE_STRING,
  PCDGetRequest,
  postPendingPCDMessage,
  ProveOptions,
  requestProveOnServer,
  SignInMessagePayload
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  IdentityV3,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { cloneDeep } from "lodash";
import { ReactNode, useCallback, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useIdentityV3, useSelf } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { getHost, getOrigin, nextFrame } from "../../../src/util";
import { Typography } from "../../../new-components/shared/Typography";
import { Button2 } from "../../../new-components/shared/Button";
import { NewLoader } from "../../../new-components/shared/NewLoader";

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
      <InnerContainer>
        <Typography color="var(--text-primary)" fontSize={20} fontWeight={800}>
          SIGN IN WITH ZUPASS
        </Typography>
        <Typography color="var(--text-primary)" fontSize={16} family="Rubik">
          {getHost(req.returnUrl)} will receive your name, your email, and your
          Semaphore public key.
        </Typography>
      </InnerContainer>
    );
  } else {
    // Website is asking for a signature of a custom message
    lines.push(
      <InnerContainer>
        <Typography color="var(--text-primary)" fontSize={20} fontWeight={800}>
          SIGN IN WITH ZUPASS
        </Typography>
        <Typography
          style={{ overflowWrap: "break-word" }}
          color="var(--text-primary)"
          fontSize={16}
          family="Rubik"
          fontWeight={500}
        >
          Signing message:
        </Typography>
        <Typography
          style={{ overflowWrap: "break-word" }}
          color="var(--text-primary)"
          fontSize={16}
          fontWeight={400}
          family="Rubik"
        >
          {req.args.signedMessage.value}
        </Typography>
      </InnerContainer>
    );
  }

  if (error !== undefined) {
    lines.push(
      <Typography color="var(--new-danger)" fontSize={16} family="Rubik">
        {error}
      </Typography>
    );
  }
  return (
    <Container>
      <ContentContainer>{lines.map((line) => line)}</ContentContainer>
      <ButtonsContainer>
        <Button2 disabled={proving || !!error} onClick={onProve}>
          {proving ? (
            <NewLoader color="white" rows={2} columns={3} />
          ) : (
            <Typography
              color="var(--text-white)"
              fontSize={18}
              fontWeight={500}
              family="Rubik"
            >
              Prove
            </Typography>
          )}
        </Button2>

        <Button2
          onClick={(): void => {
            if (window.opener && window.opener !== window) {
              // you are in a popup
              window.close();
            } else {
              window.history.back();
            }
          }}
          variant="secondary"
        >
          Back
        </Button2>
      </ButtonsContainer>
    </Container>
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

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: center;
`;
const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
