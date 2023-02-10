import { buildMerkleTree, getMerkleProof } from "./merklePoseidon";
import { initializePoseidon } from "./poseidonHash";
import * as fs from "fs";

async function doThing() {
  await initializePoseidon();

  const tree = buildMerkleTree(["1", "2", "3"]);
  const proof = getMerkleProof(tree, "1");

  console.log(tree);
  console.log(proof);

  fs.writeFileSync("./rsa.json", JSON.stringify(proof, null, 2));
}

doThing();
