/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import { MerkleProof, Poseidon, Tree } from "@personaelabs/spartan-ecdsa";
import { Identity } from "@semaphore-protocol/identity";
import assert from "assert";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import JSONBig from "json-bigint";
import "mocha";
import * as path from "path";
import {
  EthereumGroupPCD,
  EthereumGroupPCDPackage,
  GroupType,
  getRawPubKeyBuffer
} from "../src";

const zkeyFilePath: string = path.join(__dirname, "../artifacts/16.zkey");
const wasmFilePath: string = path.join(__dirname, "../artifacts/16.wasm");

async function groupProof(
  identity: SemaphoreIdentityPCD,
  wallet: ethers.Wallet,
  groupType: GroupType = GroupType.PUBLICKEY
): Promise<{
  signatureOfIdentityCommitment: string;
  msgHash: Buffer;
  merkleProof: MerkleProof;
}> {
  const signatureOfIdentityCommitment = await wallet.signMessage(
    identity.claim.identityV3.commitment.toString()
  );

  const msgHash = Buffer.from(
    ethers.utils
      .hashMessage(identity.claim.identityV3.commitment.toString())
      .slice(2),
    "hex"
  );

  const poseidon = new Poseidon();
  await poseidon.initWasm();
  const treeDepth = 20; // Provided circuits have tree depth = 20
  const tree = new Tree(treeDepth, poseidon);

  // Add some IDs to the tree before the prover's public key
  const randM = Math.floor(Math.random() * 10) + 1;
  for (let i = 0; i < randM; i++) {
    const otherWallet = ethers.Wallet.createRandom();
    tree.insert(
      groupType === GroupType.ADDRESS
        ? BigInt(otherWallet.address)
        : poseidon.hashPubKey(getRawPubKeyBuffer(otherWallet.publicKey))
    );
  }
  // Add the prover's ID to the tree
  const proverPubkeyBuffer: Buffer = getRawPubKeyBuffer(wallet.publicKey);
  tree.insert(
    groupType === GroupType.ADDRESS
      ? BigInt(wallet.address)
      : poseidon.hashPubKey(proverPubkeyBuffer)
  );

  // Add some IDs to the tree after the prover's public key
  const randN = Math.floor(Math.random() * 10) + 1;
  for (let i = 0; i < randN; i++) {
    const otherWallet = ethers.Wallet.createRandom();
    tree.insert(
      groupType === GroupType.ADDRESS
        ? BigInt(otherWallet.address)
        : poseidon.hashPubKey(getRawPubKeyBuffer(otherWallet.publicKey))
    );
  }

  // Get the index of the prover's public key in the tree
  const idIndex = tree.indexOf(
    groupType === GroupType.ADDRESS
      ? BigInt(wallet.address)
      : poseidon.hashPubKey(proverPubkeyBuffer)
  );

  // Prove membership of the prover's public key in the tree
  const merkleProof = tree.createProof(idIndex);
  return {
    signatureOfIdentityCommitment,
    msgHash,
    merkleProof
  };
}

async function happyPathEthGroupPCD(
  groupType: GroupType
): Promise<EthereumGroupPCD> {
  const identity = await SemaphoreIdentityPCDPackage.prove({
    identityV3: new Identity()
  });
  const serializedIdentity =
    await SemaphoreIdentityPCDPackage.serialize(identity);
  const wallet = ethers.Wallet.createRandom();
  const { signatureOfIdentityCommitment, merkleProof } = await groupProof(
    identity,
    wallet,
    groupType
  );

  const ethGroupPCD = await EthereumGroupPCDPackage.prove({
    merkleProof: {
      argumentType: ArgumentTypeName.String,
      value: JSONBig({ useNativeBigInt: true }).stringify(merkleProof)
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName,
      value: serializedIdentity
    },
    signatureOfIdentityCommitment: {
      argumentType: ArgumentTypeName.String,
      value: signatureOfIdentityCommitment
    },
    groupType: {
      argumentType: ArgumentTypeName.String,
      value: groupType
    }
  });

  return ethGroupPCD;
}

describe("Ethereum Group PCD", function () {
  // eslint-disable-next-line no-restricted-syntax
  this.timeout(60 * 1000 * 10);
  let ethGroupPCD: EthereumGroupPCD;

  this.beforeAll(async function () {
    const addrMembershipConfig = {
      circuit: __dirname.concat("/../artifacts/addr_membership.circuit"),
      witnessGenWasm: __dirname.concat("/../artifacts/addr_membership.wasm")
    };
    const pubkeyMembershipConfig = {
      circuit: __dirname.concat("/../artifacts/pubkey_membership.circuit"),
      witnessGenWasm: __dirname.concat("/../artifacts/pubkey_membership.wasm")
    };
    await EthereumGroupPCDPackage.init!({
      zkeyFilePath,
      wasmFilePath,
      addrMembershipConfig,
      pubkeyMembershipConfig
    });
    ethGroupPCD = await happyPathEthGroupPCD(GroupType.PUBLICKEY);
  });

  it("should work", async function () {
    assert(await EthereumGroupPCDPackage.verify(ethGroupPCD));
  });

  it("should work with address (slow ~40s)", async function () {
    const ethGroupPCD = await happyPathEthGroupPCD(GroupType.ADDRESS);
    assert(await EthereumGroupPCDPackage.verify(ethGroupPCD));
  });

  it("serializes", async function () {
    const newEthGroupPCD = await EthereumGroupPCDPackage.deserialize(
      (await EthereumGroupPCDPackage.serialize(ethGroupPCD)).pcd
    );
    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));
  });

  it("should not verify tampered inputs", async function () {
    const newEthGroupPCD = await EthereumGroupPCDPackage.deserialize(
      (await EthereumGroupPCDPackage.serialize(ethGroupPCD)).pcd
    );
    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));

    // Tamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.merkleRoot =
      newEthGroupPCD.claim.publicInput.circuitPubInput.merkleRoot + BigInt(1);

    assert(!(await EthereumGroupPCDPackage.verify(newEthGroupPCD)));

    // Untamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.merkleRoot =
      newEthGroupPCD.claim.publicInput.circuitPubInput.merkleRoot - BigInt(1);

    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));

    // Tamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Tx =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Tx + BigInt(1);

    assert(!(await EthereumGroupPCDPackage.verify(newEthGroupPCD)));

    // Untamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Tx =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Tx - BigInt(1);

    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));

    // Tamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Ty =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Ty + BigInt(1);

    assert(!(await EthereumGroupPCDPackage.verify(newEthGroupPCD)));

    // Untamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Ty =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Ty - BigInt(1);

    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));

    // Tamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Ux =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Ux + BigInt(1);

    assert(!(await EthereumGroupPCDPackage.verify(newEthGroupPCD)));

    // Untamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Ux =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Ux - BigInt(1);

    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));

    // Tamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Uy =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Uy + BigInt(1);

    assert(!(await EthereumGroupPCDPackage.verify(newEthGroupPCD)));

    // Untamper
    newEthGroupPCD.claim.publicInput.circuitPubInput.Uy =
      newEthGroupPCD.claim.publicInput.circuitPubInput.Uy - BigInt(1);

    assert(await EthereumGroupPCDPackage.verify(newEthGroupPCD));
  });

  it("should not be able create a PCD with a different identity", async function () {
    const identity1 = await SemaphoreIdentityPCDPackage.prove({
      identityV3: new Identity()
    });
    const wallet = ethers.Wallet.createRandom();
    const { signatureOfIdentityCommitment, merkleProof } = await groupProof(
      identity1,
      wallet
    );

    const identity2 = await SemaphoreIdentityPCDPackage.prove({
      identityV3: new Identity()
    });
    const serializedIdentity2 =
      await SemaphoreIdentityPCDPackage.serialize(identity2);

    await assert.rejects(
      async () =>
        // This will output an error in the console that looks like this:
        // ERROR:  4 Error in template PubKeyMembership_149 line: 45
        await EthereumGroupPCDPackage.prove({
          merkleProof: {
            argumentType: ArgumentTypeName.String,
            value: JSONBig({ useNativeBigInt: true }).stringify(merkleProof)
          },
          identity: {
            argumentType: ArgumentTypeName.PCD,
            pcdType: SemaphoreIdentityPCDTypeName,
            value: serializedIdentity2
          },
          groupType: {
            argumentType: ArgumentTypeName.String,
            value: GroupType.PUBLICKEY
          },
          signatureOfIdentityCommitment: {
            argumentType: ArgumentTypeName.String,
            value: signatureOfIdentityCommitment
          }
        })
    );
  });

  it("should not be able to create a PCD with tampered merkle root", async function () {
    const identity = await SemaphoreIdentityPCDPackage.prove({
      identityV3: new Identity()
    });
    const serializedIdentity =
      await SemaphoreIdentityPCDPackage.serialize(identity);
    const wallet = ethers.Wallet.createRandom();
    const { merkleProof, signatureOfIdentityCommitment } = await groupProof(
      identity,
      wallet
    );

    // Tamper with the merkle root
    merkleProof.root = merkleProof.root + BigInt(1);

    await assert.rejects(async () => {
      // This will output an error in the console that looks like this:
      // ERROR:  4 Error in template PubKeyMembership_149 line: 45
      await EthereumGroupPCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          pcdType: SemaphoreIdentityPCDTypeName,
          value: serializedIdentity
        },
        groupType: {
          argumentType: ArgumentTypeName.String,
          value: GroupType.PUBLICKEY
        },
        signatureOfIdentityCommitment: {
          argumentType: ArgumentTypeName.String,
          value: signatureOfIdentityCommitment
        },
        merkleProof: {
          argumentType: ArgumentTypeName.String,
          value: JSONBig({ useNativeBigInt: true }).stringify(merkleProof)
        }
      });
    });
  });
});
