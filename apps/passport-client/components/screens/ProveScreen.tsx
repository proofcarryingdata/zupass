import { PCDGetRequest, PCDRequestType } from "@pcd/passport-interface";
import * as React from "react";
import { useCallback, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { DispatchContext, Dispatcher } from "../../src/dispatch";
import { Button, H1, Spacer } from "../core";

import { title } from "process";
import { AppHeader } from "../shared/AppHeader";
import { PCDArgs } from "../shared/PCDArgs";

export function ProveScreen() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [state, dispatch] = useContext(DispatchContext);
  const request = JSON.parse(params.get("request")) as PCDGetRequest;
  const [args, setArgs] = useState(JSON.parse(JSON.stringify(request.args)));
  const pcdPackage = state.pcds.getPackage(request.pcdType);
  const onProveClick = useCallback(async () => {
    const proof = await pcdPackage.prove(args);
    console.log(proof);
  }, []);

  if (request.type !== PCDRequestType.Get) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <ProveWrap>
      <Spacer h={24} />
      <AppHeader />
      <Spacer h={24} />
      <H1>🔑 &nbsp; {title}</H1>
      <Spacer h={24} />
      {request.pcdType}
      <pre>{JSON.stringify(args, null, 2)}</pre>
      <PCDArgs args={args} setArgs={setArgs} pcdCollection={state.pcds} />
      <Spacer h={16} />
      <Button onClick={onProveClick}>PROVE</Button>
      <Spacer h={64} />
    </ProveWrap>
  );
}

// function ProveSemaGroupSig({ req }: { req: PCDReqGetSemaGroupSig }) {
//   // Load semaphore group
//   const [group, setGroup] = useState<SerializedSemaphoreGroup>(null);
//   useEffect(() => {
//     const fetchGroup = async () => {
//       const res = await fetch(req.params.groupUrl);
//       const group = JSON.parse(await res.json());
//       console.log("Got semaphore group", group);
//       setGroup(group as SerializedSemaphoreGroup);
//     };
//     fetchGroup().catch(console.error);
//   }, []);

//   // Once that's done & user clicks Prove, create a zero-knowledge proof
//   const [state] = useContext(DispatchContext);
//   const [proving, setProving] = useState(false);
//   const onProve = useCallback(async () => {
//     setProving(true);
//     const serializedProof = await prove(state.identity!, group);

//     // Redirect back to requester
//     window.location.href = `${req.returnUrl}?proof=${serializedProof}`;
//   }, [group, setProving]);

//   const lines: ReactNode[] = [];
//   lines.push(<p>Loading {req.params.groupUrl}</p>);
//   if (group != null) {
//     lines.push(<p>Loaded {group.name}</p>);
//     lines.push(
//       <p>You're proving that you're one of {group.members.length} members</p>
//     );
//     lines.push(<Button onClick={onProve}>Prove</Button>);
//   }
//   if (proving) {
//     lines.push(<p>Proving...</p>);
//   }

//   return (
//     <div>
//       {lines.map((line, i) => (
//         <LineWrap key={i}>{line}</LineWrap>
//       ))}
//     </div>
//   );
// }

function err(dispatch: Dispatcher, title: string, message: string) {
  dispatch({
    type: "error",
    error: { title, message },
  });
}

const ProveWrap = styled.div`
  width: 100%;
`;

const LineWrap = styled.div`
  margin-bottom: 16px;
`;

// async function prove(identity: Identity, semaGroup: SerializedSemaphoreGroup) {
//   const { prove, serialize } = SemaphoreGroupPCDPackage;

//   const group = new Group(BigInt(semaGroup.id), semaGroup.depth);
//   for (const member of semaGroup.members) {
//     group.addMember(BigInt(member));
//   }
//   const externalNullifier = 1; // group.root;
//   const signal = 1;

//   const args: SemaphoreGroupPCDArgs = {
//     externalNullifier: BigInt(externalNullifier),
//     signal: BigInt(signal),
//     group,
//     identity,
//     zkeyFilePath: "/semaphore-artifacts/16.zkey",
//     wasmFilePath: "/semaphore-artifacts/16.wasm",
//   };
//   console.log("Proving semaphore membership", args);
//   console.log("Group root", group.root.toString());
//   console.log("Group first member", group.members[0]);
//   console.log("Identity", identity.commitment.toString());

//   const pcd = await prove(args);
//   const serialized = await serialize(pcd);
//   console.log("Proof complete", serialized);

//   return serialized;
// }
