import { constructPassportPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreGroupPCD,
  SemaphoreGroupPCDPackage,
  SerializedSemaphoreGroup,
} from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { useEffect, useState } from "react";
import styled from "styled-components";

export default function Web() {
  // Request a proof from the passport
  const url = constructPassportPcdGetRequestUrl<
    typeof SemaphoreGroupPCDPackage
  >(
    "http://localhost:3000/",
    "http://localhost:3001/",
    SemaphoreGroupPCDPackage.name,
    {
      externalNullifier: {
        argumentType: ArgumentTypeName.BigInt,
        userProvided: false,
        value: "1",
      },
      group: {
        argumentType: ArgumentTypeName.Object,
        userProvided: false,
        remoteUrl: "http://localhost:3002/semaphore/1",
      },
      identity: {
        argumentType: ArgumentTypeName.PCD,
        value: undefined,
        userProvided: true,
      },
      signal: {
        argumentType: ArgumentTypeName.BigInt,
        value: "1",
        userProvided: false,
      },
    }
  );

  // Handle callback from the passport, providing a proof
  const [proof, setProof] = useState<SemaphoreGroupPCD>(); // opaque JSON object
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proofEnc = params.get("proof");
    if (proofEnc) {
      const parsedPCD = JSON.parse(decodeURIComponent(proofEnc));
      SemaphoreGroupPCDPackage.deserialize(parsedPCD.pcd).then((pcd) => {
        setProof(pcd);
        console.log("Clearing URL");
        window.history.replaceState(null, document.title, "/");
      });
    }
  }, [setProof]);

  // Meanwhile, load the group so that we can verify against it
  const [group, setGroup] = useState<SerializedSemaphoreGroup>();
  useEffect(() => {
    (async () => {
      const res = await fetch("http://localhost:3002/semaphore/1");
      const group = JSON.parse(await res.json()) as SerializedSemaphoreGroup;
      setGroup(group);
    })();
  }, [setGroup]);

  // Verify the proof
  const [valid, setValid] = useState<boolean>();
  useEffect(() => {
    if (proof && group) {
      verifyProof(proof, group).then(setValid);
    }
  }, [proof, group, setValid]);

  return (
    <Container>
      <h1>Welcome to Zuzalu!</h1>
      <button
        onClick={() => {
          window.location.href = url;
        }}
      >
        Prove Residency
      </button>
      {proof != null && (
        <>
          <h2>Got PCD from passport</h2>
          <pre>{JSON.stringify(proof, null, 2)}</pre>
          <h2>Verifying proof...</h2>
          {group && <p>✅ Loaded group, {group.members.length} members</p>}
          {valid === false && <p>❌ Proof is invalid</p>}
          {valid === true && <p>✅ Proof is valid</p>}
        </>
      )}
      {valid && <h2>Welcome, anon</h2>}
    </Container>
  );
}

const Container = styled.div`
  font-family: system-ui, sans-serif;
`;

async function verifyProof(
  proof: unknown,
  semaGroup: SerializedSemaphoreGroup
): Promise<boolean> {
  const { deserialize, verify } = SemaphoreGroupPCDPackage;
  console.log("Verifying proof");
  const deserialized = await deserialize(JSON.stringify(proof));
  const verified = await verify(deserialized);
  console.log(`Verified proof: ${verified}`);
  if (!verified) return false;

  // TODO: why does deserialized.claim not contain a merkle root?
  // More importantly, why does `group` as loaded from server not specify a root?
  // Reconstructing it from the members list seems inefficient.
  const group = new Group(1, 16);
  group.addMembers(semaGroup.members);
  const root = deserialized.proof.proof.merkleTreeRoot;
  console.log(`Proof root ${root}, group root ${group.root}`);

  return root.toString() === group.root.toString();
}
