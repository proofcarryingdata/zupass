import {
  PCDGetRequest,
  postPendingPCDMessage,
  postSerializedPCDMessage,
  requestProveOnServer,
  requestSemaphoreGroup
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { getErrorMessage } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import { ReactNode, useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import { useIdentityV3 } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { getHost, nextFrame } from "../../../src/util";
import { Button2 } from "../../../new-components/shared/Button";
import { Typography } from "../../../new-components/shared/Typography";
import { NewLoader } from "../../../new-components/shared/NewLoader";

export function SemaphoreGroupProveScreen({
  req
}: {
  req: PCDGetRequest<typeof SemaphoreGroupPCDPackage>;
}): JSX.Element {
  const [error, setError] = useState<string | undefined>();
  const [group, setGroup] = useState<SerializedSemaphoreGroup | null>(null);
  const identity = useIdentityV3();
  const [proving, setProving] = useState(false);
  const isLoading = group === null;
  useEffect(() => {
    const fetchGroup = async (): Promise<void> => {
      console.log("fetching semaphore group", req.args.group.remoteUrl);
      const semaphoreGroupResult = await requestSemaphoreGroup(
        // This string should always be defined if the PCDGetRequest template
        // type is SemaphoreGroupPCDPackage
        req.args.group.remoteUrl as string
      );

      if (!semaphoreGroupResult.success) {
        console.error(
          "error fetching semaphore group",
          semaphoreGroupResult.error
        );
        setError(semaphoreGroupResult.error);
        return;
      }

      console.log("got semaphore group", semaphoreGroupResult.value);
      setGroup(semaphoreGroupResult.value);
    };

    fetchGroup();
  }, [req.args.group.remoteUrl]);

  const onProveClick = useCallback(async () => {
    try {
      setProving(true);

      // Give the UI has a chance to update to the 'loading' state before the
      // potentially blocking proving operation kicks off
      await nextFrame();

      const args = await fillArgs(
        identity,
        // Group is definitely not null here, as `onProveClick` would not be
        // in use as an event handler if the group had not been fetched.
        group as SerializedSemaphoreGroup,
        req.args
      );

      if (req.options?.proveOnServer === true) {
        const pendingPCDResult = await requestProveOnServer(
          appConfig.zupassServer,
          {
            pcdType: SemaphoreGroupPCDPackage.name,
            args: args
          }
        );

        if (!pendingPCDResult.success) {
          throw new Error(
            "Failed to get pending PCD " + pendingPCDResult.error
          );
        }

        if (window.opener && req.postMessage) {
          postPendingPCDMessage(window.opener, pendingPCDResult.value);
          window.close();
        }

        safeRedirectPending(req.returnUrl, pendingPCDResult.value);
      } else {
        const { prove, serialize } = SemaphoreGroupPCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        if (window.opener && req.postMessage) {
          postSerializedPCDMessage(window.opener, serializedPCD);
          window.close();
        }
        safeRedirect(req.returnUrl, serializedPCD);
      }
    } catch (e) {
      setProving(false);
      const errorMessage = getErrorMessage(e);
      if (errorMessage.indexOf("The identity is not part of the group") >= 0) {
        setError("You are not part of this group");
      } else {
        setError(errorMessage);
      }
    }
  }, [
    identity,
    group,
    req.args,
    req.options?.proveOnServer,
    req.postMessage,
    req.returnUrl
  ]);

  const content: ReactNode[] = [];
  if (group === null) {
    content.push(
      <Typography fontSize={16} family="Rubik">
        Loading the group...
      </Typography>
    );
  } else {
    content.push(
      <InnerContainer>
        <Typography color="var(--text-primary)" fontSize={20} fontWeight={800}>
          SIGN IN WITH ZUPASS
        </Typography>
        <Typography color="var(--text-primary)" fontSize={16} family="Rubik">
          {getHost(req.returnUrl)} will receive a proof that you're one of{" "}
          <Typography
            fontSize={16}
            color="var(--core-accent)"
            fontWeight={500}
            family="Rubik"
          >
            {group.members.length}
          </Typography>{" "}
          members of
        </Typography>
      </InnerContainer>,
      <GroupNameLabel>
        <Typography
          family="Rubik"
          fontSize={16}
          color="var(--text-primary)"
          fontWeight={500}
        >
          {group.name}
        </Typography>
      </GroupNameLabel>,
      <Typography color="var(--text-primary)" fontSize={16} family="Rubik">
        This zero-knowledge proof won’t reveal anything else about you.
      </Typography>
    );
  }

  if (error !== undefined) {
    content.push(
      <Typography color="var(--new-danger)" fontSize={16} family="Rubik">
        {error}
      </Typography>
    );
  }

  return (
    <Container>
      <ContentContainer>{content.map((line) => line)}</ContentContainer>
      <ButtonsGroup>
        {!isLoading && (
          <Button2 disabled={proving || !!error} onClick={onProveClick}>
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
        )}
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
          <Typography fontSize={18} fontWeight={500} family="Rubik">
            Back
          </Typography>
        </Button2>
      </ButtonsGroup>
    </Container>
  );
}

async function fillArgs(
  identityV3: Identity,
  semaphoreGroup: SerializedSemaphoreGroup,
  reqArgs: SemaphoreGroupPCDArgs
): Promise<SemaphoreGroupPCDArgs> {
  let args: SemaphoreGroupPCDArgs = {
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: 23 + ""
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: 34 + ""
    },
    group: {
      argumentType: ArgumentTypeName.Object,
      value: semaphoreGroup
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identityV3 })
      )
    }
  };

  // in the case the requesting application actually submitted some
  // nullifier, use that instead of the hard-coded one
  if (reqArgs.externalNullifier.value !== undefined) {
    args = {
      ...args,
      externalNullifier: reqArgs.externalNullifier
    };
  }
  // same, but for signal
  if (reqArgs.signal.value !== undefined) {
    args = { ...args, signal: reqArgs.signal };
  }

  return args;
}

const GroupNameLabel = styled.div`
  border-radius: 8px;
  border: 1px solid #eceaf4;
  background: var(--secondary-input-bg);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ButtonsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  text-align: center;
`;
