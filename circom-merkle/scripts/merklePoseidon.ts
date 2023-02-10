// NOTE: copied from personaelabs/data because I(@lsankar4033) don't know how to npm typescript

import { buildPoseidon } from "circomlibjs";

let poseidon: any;
let F: any;

// NOTE: picked this as the null field element arbitrarily
const NULL_NODE = 1n;

export interface MerkleTree {
  root;
  leafToPathElements;
  leafToPathIndices;
}

// NOTE: default tree depth based on dao hack confessions
async function buildTreePoseidon(
  leaves,
  depth = 15,
  proof_depth = 30,
  nullNode = NULL_NODE
): Promise<MerkleTree> {
  if (!poseidon) {
    poseidon = await buildPoseidon();
    F = poseidon.F;
  }

  // pad with nullNode to guarantee a tree of the desired depth
  const requiredLeaves = 2 ** depth;
  if (leaves.length < requiredLeaves) {
    leaves = leaves.concat(
      Array(requiredLeaves - leaves.length).fill(nullNode)
    );
  }

  leaves = leaves.map(BigInt);
  leaves.sort();

  // the equivalent of pathElements and pathIndices in merkle.circom
  const outputLeaves = leaves.filter((w) => w !== nullNode);
  let leafToPathElements = Object.fromEntries(outputLeaves.map((w) => [w, []]));
  let leafToPathIndices = Object.fromEntries(outputLeaves.map((w) => [w, []]));

  let nodeToLeaves = Object.fromEntries(leaves.map((w) => [w, [w]]));
  let curLevel = leaves;
  while (curLevel.length > 1) {
    let newLevel = [];

    for (let i = 0; i < curLevel.length; i += 2) {
      let child1 = curLevel[i];
      let child2 = i == curLevel.length - 1 ? nullNode : curLevel[i + 1];

      let child1Leaves = nodeToLeaves[child1];
      let child2Leaves = child2 == nullNode ? [] : nodeToLeaves[child2];

      for (const leaf of child1Leaves) {
        if (leaf !== nullNode) {
          leafToPathElements[leaf].push(child2);
          leafToPathIndices[leaf].push("0");
        }
      }

      for (const leaf of child2Leaves) {
        if (leaf !== nullNode) {
          leafToPathElements[leaf].push(child1);
          leafToPathIndices[leaf].push("1");
        }
      }

      let poseidonRes = poseidon([child1, child2]);
      let parent = F.toObject(poseidonRes);

      nodeToLeaves[parent] = child1Leaves.concat(child2Leaves);

      newLevel.push(parent);
    }

    curLevel = newLevel;
  }

  for (const leaf in leafToPathElements) {
    while (leafToPathElements[leaf].length < proof_depth) {
      leafToPathElements[leaf].push(nullNode);
      leafToPathIndices[leaf].push("0");
    }
  }

  return {
    root: curLevel[0],
    leafToPathElements,
    leafToPathIndices,
  };
}

export { buildTreePoseidon };
