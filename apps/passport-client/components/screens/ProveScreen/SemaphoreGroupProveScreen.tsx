import {
  PCDGetRequest,
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
import { useIdentity } from "../../../src/appHooks";
import {
  safeRedirect,
  safeRedirectPending
} from "../../../src/passportRequest";
import { getHost, nextFrame } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { BackButton } from "../../shared/ScreenNavigation";

export function SemaphoreGroupProveScreen({
  req
}: {
  req: PCDGetRequest<typeof SemaphoreGroupPCDPackage>;
}): JSX.Element {
  const [error, setError] = useState<string | undefined>();
  const [group, setGroup] = useState<SerializedSemaphoreGroup | null>(null);
  const identity = useIdentity();
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

        safeRedirectPending(req.returnUrl, pendingPCDResult.value);
      } else {
        const { prove, serialize } = SemaphoreGroupPCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        safeRedirect(req.returnUrl, serializedPCD);
      }
    } catch (e) {
      const errorMessage = getErrorMessage(e);
      if (errorMessage.indexOf("The identity is not part of the group") >= 0) {
        setError("You are not part of this group.");
      } else {
        setError(errorMessage);
      }
    }
  }, [identity, group, req.args, req.options?.proveOnServer, req.returnUrl]);

  const lines: ReactNode[] = [];
  if (group === null) {
    lines.push(<p>Loading the group...</p>);
  } else {
    lines.push(
      <p style={{ textAlign: "center" }}>
        <b>{getHost(req.returnUrl)}</b> will receive a proof that you're one of{" "}
        {group.members.length} members of <br />
        <GroupNameLabel>{group.name}</GroupNameLabel>
      </p>
    );
    lines.push(
      <p style={{ textAlign: "center" }}>
        This zero-knowledge proof won't reveal anything else about you
      </p>
    );
  }

  if (!proving && error === undefined) {
    lines.push(
      <Button disabled={isLoading} onClick={onProveClick}>
        {isLoading ? "Loading..." : "Prove"}
      </Button>
    );
  } else if (error !== undefined) {
    lines.push(<ErrorContainer>{error}</ErrorContainer>);
  } else {
    lines.push(<RippleLoader />);
  }

  if (!proving) {
    lines.push(<BackButton />);
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
        await SemaphoreIdentityPCDPackage.prove({ identity })
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

const LineWrap = styled.div`
  margin-bottom: 16px;
`;

const ErrorContainer = styled.div`
  color: white;
  border-radius: 99px;
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--danger);
`;

const GroupNameLabel = styled.div`
  display: inline-block;
  padding: 2px 4px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  margin: 4px;
  background-color: rgba(255, 255, 255, 0.1);
`;
