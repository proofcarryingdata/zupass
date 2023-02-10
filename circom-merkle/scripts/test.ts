import { buildMerkleTree, getMerkleProof } from "./merklePoseidon";
import { initializePoseidon } from "./poseidonHash";

async function doThing() {
  await initializePoseidon();

  const tree = buildMerkleTree(["1", "2", "3"]);
  const proof = getMerkleProof(tree, "1");

  console.log(tree);
  console.log(proof);
}

doThing();
