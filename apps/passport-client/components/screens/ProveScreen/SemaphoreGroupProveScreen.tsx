import { PCDGetRequest, ProveRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { requestPendingPCD } from "../../../src/api/requestPendingPCD";
import { DispatchContext } from "../../../src/dispatch";
import {
  safeRedirect,
  safeRedirectPending,
} from "../../../src/passportRequest";
import { getReferrerHost, sleep } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";

export function SemaphoreGroupProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreGroupPCDPackage>;
}) {
  const [error, setError] = useState<string | undefined>();
  const [group, setGroup] = useState<SerializedSemaphoreGroup | null>(null);
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);
  const isLoading = group === null;

  useEffect(() => {
    const fetchGroup = async () => {
      const res = await fetch(req.args.group.remoteUrl);
      const group = (await res.json()) as SerializedSemaphoreGroup;
      console.log("Got semaphore group", group);
      setGroup(group);
    };
    fetchGroup().catch(console.error);
  }, [req.args.group.remoteUrl]);

  const onProve = useCallback(async () => {
    try {
      setProving(true);

      // Give the UI has a chance to update to the 'loading' state before the
      // potentially blocking proving operation kicks off
      await sleep(200);

      const args = await fillArgs(state.identity, group, req.args);

      if (req.options?.proveOnServer === true) {
        const serverReq: ProveRequest = {
          pcdType: SemaphoreGroupPCDPackage.name,
          args: args,
        };
        const pendingPCD = await requestPendingPCD(serverReq);
        safeRedirectPending(req.returnUrl, pendingPCD);
      } else {
        const { prove, serialize } = SemaphoreGroupPCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        safeRedirect(req.returnUrl, serializedPCD);
      }
    } catch (e) {
      if (
        typeof e.message === "string" &&
        e.message.indexOf("The identity is not part of the group") >= 0
      ) {
        setError("You are not part of this group.");
      } else if (typeof e.message === "string") {
        setError(e.message);
      }
    }
  }, [
    group,
    req.returnUrl,
    state.identity,
    req.args,
    req.options?.proveOnServer,
  ]);

  const lines: ReactNode[] = [];
  if (group === null) {
    lines.push(<p>Loading the group...</p>);
  } else {
    lines.push(
      <p>
        <b>{getReferrerHost()}</b> is requesting a proof that you're one of{" "}
        {group.members.length} members of {group.name}.
      </p>
    );
  }

  if (!proving && error === undefined) {
    lines.push(
      <Button disabled={isLoading} onClick={onProve}>
        {isLoading ? "Loading..." : "Prove"}
      </Button>
    );
  } else if (error !== undefined) {
    lines.push(<ErrorContainer>{error}</ErrorContainer>);
  } else {
    lines.push(<RippleLoader />);
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
      value: 23 + "",
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: 34 + "",
    },
    group: {
      argumentType: ArgumentTypeName.Object,
      value: semaphoreGroup,
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  // in the case the requesting application actually submitted some
  // nullifier, use that instead of the hard-coded one
  if (reqArgs.externalNullifier.value !== undefined) {
    args = {
      ...args,
      externalNullifier: reqArgs.externalNullifier,
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
