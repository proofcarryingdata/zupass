import { PCDGetRequest, ProveRequest } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCDArgs,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
  serializeSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Group } from "@semaphore-protocol/group";
import { Identity } from "@semaphore-protocol/identity";
import * as React from "react";
import { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { requestPendingPCD } from "../../../src/api/requestPendingPCD";
import { DispatchContext } from "../../../src/dispatch";
import { sleep } from "../../../src/util";
import { Button } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";

export function SemaphoreGroupProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreGroupPCDPackage>;
}) {
  const [error, setError] = useState<string | undefined>();

  // Load semaphore group
  const [group, setGroup] = useState<SerializedSemaphoreGroup>(null);
  useEffect(() => {
    const fetchGroup = async () => {
      const res = await fetch(req.args.group.remoteUrl);
      const group = (await res.json()) as SerializedSemaphoreGroup;
      console.log("Got semaphore group", group);
      setGroup(group);
    };
    fetchGroup().catch(console.error);
  }, [req.args.group.remoteUrl]);

  // Once that's done & user clicks Prove, create a zero-knowledge proof
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);

  const onProve = useCallback(async () => {
    try {
      setProving(true);

      // Give the UI has a chance to update to the 'loading' state before the
      // potentially blocking proving operation kicks off
      sleep(200);

      const args = await fillArgs(state.identity, group, req.args);

      if (req.options?.proveOnServer === true) {
        const serverReq: ProveRequest = {
          pcdType: SemaphoreGroupPCDPackage.name,
          args: args,
        };
        const pendingPCD = await requestPendingPCD(serverReq);
        window.location.href = `${
          req.returnUrl
        }?encodedPendingPCD=${JSON.stringify(pendingPCD)}`;
      } else {
        const { prove, serialize } = SemaphoreGroupPCDPackage;
        const pcd = await prove(args);
        const serializedPCD = await serialize(pcd);
        window.location.href = `${req.returnUrl}?proof=${JSON.stringify(
          serializedPCD
        )}`;
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
    const websiteName =
      req.options?.description !== undefined
        ? req.options?.description
        : "This website";

    lines.push(
      <p>
        <b>{websiteName}</b> is requesting a proof that you're one of{" "}
        {group.members.length} members of {group.name}.
      </p>
    );
  }

  if (!proving && error === undefined) {
    lines.push(<Button onClick={onProve}>Prove</Button>);
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
  const group = new Group(BigInt(semaphoreGroup.id), semaphoreGroup.depth);
  for (const member of semaphoreGroup.members) {
    group.addMember(BigInt(member));
  }

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
      value: serializeSemaphoreGroup(group, "Zuzalu Attendees"),
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
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

  console.log("Proving semaphore membership", args);
  console.log("Group root", group.root.toString());
  console.log("Group first member", group.members[0]);
  console.log("Identity", identity.commitment.toString());

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
