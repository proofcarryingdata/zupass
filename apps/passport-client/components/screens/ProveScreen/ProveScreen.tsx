import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
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
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import { err } from "../../../src/util";
import { Button, H1, Spacer } from "../../core";
import { AppHeader } from "../../shared/AppHeader";
import { ParameterizedProveScreen } from "./ParameterizedProveScreen";

export function ProveScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;

  if (request.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  if (request.pcdType !== SemaphoreGroupPCDPackage.name) {
    return <ParameterizedProveScreen />;
  }

  // TODO: PCDPackage needs display information, hardcoded below for now
  const title = "Prove membership";
  const body = <ProveSemaGroupSig req={request} />;

  return (
    <div>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H1>🔑 &nbsp; {title}</H1>
      <Spacer h={24} />
      {body}
    </div>
  );
}

function ProveSemaGroupSig({
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
  }, []);

  // Once that's done & user clicks Prove, create a zero-knowledge proof
  const [state] = useContext(DispatchContext);
  const [proving, setProving] = useState(false);
  const onProve = useCallback(async () => {
    setProving(true);
    const pcdPackage = state.pcds.getPackage(req.pcdType);
    const pcd = await prove(state.identity!, group);

    // Redirect back to requester
    window.location.href = `${req.returnUrl}?proof=${JSON.stringify(pcd)}`;
  }, [group, setProving]);

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

async function prove(identity: Identity, semaGroup: SerializedSemaphoreGroup) {
  const { prove, serialize } = SemaphoreGroupPCDPackage;

  const group = new Group(BigInt(semaGroup.id), semaGroup.depth);
  for (const member of semaGroup.members) {
    group.addMember(BigInt(member));
  }
  const externalNullifier = 1; // group.root;
  const signal = 1;

  const args: SemaphoreGroupPCDArgs = {
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier + "",
    },
    signal: {
      argumentType: ArgumentTypeName.BigInt,
      value: signal + "",
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

  console.log("Proving semaphore membership", args);
  console.log("Group root", group.root.toString());
  console.log("Group first member", group.members[0]);
  console.log("Identity", identity.commitment.toString());

  const pcd = await prove(args);
  const serialized = await serialize(pcd);
  console.log("Proof complete", serialized);

  return serialized;
}

const LineWrap = styled.div`
  margin-bottom: 16px;
`;
