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
import { Button } from "../../core";

export function SemaphoreGroupProveScreen({
  req,
}: {
  req: PCDGetRequest<typeof SemaphoreGroupPCDPackage>;
}) {
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
    setProving(true);
    const args = await fillArgs(state.identity, group, req.args);

    if (req.options?.server === true) {
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
  }, [group, req.returnUrl, state.identity, req.args, req.options?.server]);

  const lines: ReactNode[] = [];
  lines.push(<p>Loading {req.args.group.remoteUrl}</p>);
  if (group != null) {
    lines.push(<p>Loaded {group.name}</p>);
    lines.push(
      <p>You're proving that you're one of {group.members.length} members</p>
    );
    lines.push(<Button onClick={onProve}>Prove</Button>);
  }
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
