/*
 * This file provides example usage of GPC (General Purpose Circuits) libraries
 * to make proofs about PODs (Provable Object Data).
 *
 * It might eventually turn into tutorials in package docs or sample apps,
 * but for now it's just a preliminary demonstration of what code to use GPCs
 * looks like.  See podExample.ts for an example of how to make POD objects
 * to prove about.
 *
 * The code for creating and verifying GPC proofs PODs is found in the @pcd/gpc
 * package.  The @pcd/gpc-pcd package wraps a GPC proof in a way which can be
 * created, transmitted, stored, and displayed in apps like Zupass and
 * Zubox/Podbox which understand many types of PCDs.
 *
 * All the GPC code is an early prototype, and details are subject to change.
 * Feedback is welcome.
 *
 * -- artwyman
 */

import {
  GPCProofConfig,
  GPCProofInputs,
  deserializeGPCBoundConfig,
  deserializeGPCRevealedClaims,
  gpcBindConfig,
  gpcProve,
  gpcVerify,
  serializeGPCBoundConfig,
  serializeGPCProofConfig,
  serializeGPCRevealedClaims
} from "@pcd/gpc";
import { GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries, podEntriesToSimplifiedJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import _ from "lodash";
import * as path from "path";
import { Groth16Proof } from "snarkjs";
import { v4 as uuid } from "uuid";

/**
 * You can run this example code with this command: yarn test
 */
export async function gpcDemo(): Promise<void> {
  console.log("**** GPC Demo ****");

  // First let's create some PODs to prove things about.  This duplicates
  // many details from the POD demo, so see that file for more details.
  const privateKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const semaphoreIdentity = new Identity();
  console.log("Semaphore commitment", semaphoreIdentity.commitment);
  const podSword = POD.sign(
    {
      pod_type: { type: "string", value: "item.weapon" },
      itemSet: { type: "string", value: "celestial" },
      attack: { type: "int", value: 7n },
      owner: { type: "cryptographic", value: semaphoreIdentity.commitment }
    } satisfies PODEntries,
    privateKey
  );
  console.log(
    "Sword",
    podEntriesToSimplifiedJSON(podSword.content.asEntries())
  );
  const podShield = POD.sign(
    {
      pod_type: { type: "string", value: "item.shield" },
      itemSet: { type: "string", value: "celestial" },
      defense: { type: "int", value: 5n },
      owner: { type: "cryptographic", value: semaphoreIdentity.commitment }
    } satisfies PODEntries,
    privateKey
  );
  console.log(
    "Shield",
    podEntriesToSimplifiedJSON(podShield.content.asEntries())
  );
  const signerPublicKey = podSword.signerPublicKey;

  //////////////////////////////////////////////////////////////////////////////
  // The libraries for proving GPCs are found in the @pcd/gpc package.
  // A lot of documentation can befound on the types in the gpcTypes.ts module.
  // The primary public interface is found in the gpc.ts module.
  // All the types involved are intended to be immutable, but you can manipulate
  // them as you wish.
  // The purpose of the GPC library is to hide the details of the ZK circuits
  // used to generate and verify proofs.  Proofs can be created using a
  // high-level configuration, and the library will automatically pick one of
  // many available circuits from a GPC family which is suitable for the proof.
  //////////////////////////////////////////////////////////////////////////////

  // A GPCConfig specifies what we want to prove about one or more PODs.  It's
  // intended to be reusable to generate multiple proofs.
  const simpleProofConfig: GPCProofConfig = {
    pods: {
      // I'm calling this POD "weapon", but that's an arbitray name assigned
      // in config, not cryptographically verified.
      weapon: {
        entries: {
          // I'm proving the presence of an entry called "attack"
          // and revealing its value.
          attack: { isRevealed: true },

          // I'm proving the presence of an entry called "owner".  I'm not
          // revealing it, but proving that it matches the commitment of my
          // semaphore identity.
          owner: { isRevealed: false, isOwnerID: true }
        }
      }
    }
  };

  // Note that anything not mentioned in the config isn't being proven.  For
  // instance, I didn't check the pod_type, so this config could be met by some
  // other type with a "damage" field.  My POD also may or may not have many
  // other entries not included in the proof.

  // To generate a proof I need to pair a config with a set of inputs, including
  // the POD(s) to prove about.  Inputs an also enable extra security features
  // of the proof.
  const simpleProofInputs: GPCProofInputs = {
    pods: {
      // The name "weapon" here matches this POD with the config above.
      weapon: podSword
    },

    owner: {
      // Here I provide my private identity info.  It's not revealed in the
      // proof, but used to prove the correctness of the "owner" entry as
      // specified in the config.
      semaphoreV3: semaphoreIdentity,

      // I can optionally ask to generate a nullifier, which is tied to my
      // identity and to the external nullifier value here.  This can be used
      // to avoid exploits like double-voting.
      externalNullifier: { type: "string", value: "attack round 3" }
    },

    // Watermark gets carried in the proof and can be used to ensure the same
    // proof isn't reused outside of its intended context.  A timestamp is
    // one possible way to do that.
    watermark: { type: "int", value: BigInt(Date.now()) }
  };

  // In order to generate and verify a proof we also need certain binary
  // artifacts (proving key, verification key, and witness generator).
  // These are a part of the GPC library, generated for each of a family
  // of related circuits.
  // Artifacts can be loaded from a file (in Node) or downloaded from a URL (in
  // browser).  In this case, these test artifacts can be used so long as
  // the command `yarn gen-test-artifacts` has been run before.
  const GPCIRCUITS_PACKAGE_PATH = path.join(
    __dirname,
    "../../../lib/gpcircuits"
  );
  const GPC_TEST_ARTIFACTS_PATH = path.join(
    GPCIRCUITS_PACKAGE_PATH,
    "artifacts/test"
  );

  // Now that we have all the arguments ready, we can generate a proof.
  const { proof, boundConfig, revealedClaims } = await gpcProve(
    simpleProofConfig,
    simpleProofInputs,
    GPC_TEST_ARTIFACTS_PATH
  );

  // The proof object is the mathematical proof of correcntess.  It's just
  // a bunch of opaque numbers.
  console.log("Proof", proof);

  // The bound config is a canonicalized version of our original proof config
  // with one important addition.  The circuit identifier specifies the ZK
  // circuit which was used to generate the proof, and must also be used
  // to verify.
  console.log("Simple proof used circuit", boundConfig.circuitIdentifier);

  // We can also manually "bind" a config to a specific circuit if we want
  // to be sure we can reuse it compatibly later.  Passing an already-bound
  // config into gpcProve ensures the same circuit will be used.  This can allow
  // you to skip sending the config to the verifier with every proof.
  const { boundConfig: manualBoundConfig, circuitDesc } =
    gpcBindConfig(simpleProofConfig);

  // Note that gpcBindConfig might not always pick the same circuit as gpcProve,
  // since it doesn't know the size of the inputs.  It's possible to specify
  // a circuit by identifier instead if you know the right one to pick.
  console.log(
    "Manually bound config used circuit",
    manualBoundConfig.circuitIdentifier,
    circuitDesc
  );

  // The revealed claims object contains redacted information about the inputs
  // which should be revealed to the verifier.
  console.log("Revealed claims", serializeGPCRevealedClaims(revealedClaims, 2));

  // Proof config (bound or unbound) and revealed claims can be serialized.
  // The proof itself is also a simple JSON object.
  // In most cases, they'd be sent from prover to verifier across the network,
  // so the prover would serialize them like this:
  const serializedProof = JSON.stringify(proof);
  const serializedConfig = serializeGPCBoundConfig(boundConfig);
  const serializedClaims = serializeGPCRevealedClaims(revealedClaims);

  // Then the verifier would deserialize the like this.
  // Deserializing also validates their structure, though not (yet) the
  // correctness of the proof.
  const vProof = JSON.parse(serializedProof) as Groth16Proof;
  const vConfig = deserializeGPCBoundConfig(serializedConfig);
  const vClaims = deserializeGPCRevealedClaims(serializedClaims);

  // With these same 3 inputs (and the ZK artifacts) we can verify the proof.
  // This includes verifying all the revealed entries, along with the watermark
  // and nullifier.
  const isValid = await gpcVerify(
    vProof,
    vConfig,
    vClaims,
    GPC_TEST_ARTIFACTS_PATH
  );
  if (!isValid) {
    throw new Error("Proof didn't verify!");
  }

  // Note that `gpcVerify` only checks that the inputs are valid with
  // respect to each other.  You still need to check that everything is as
  // you expect.
  // If the config isn't hard-coded in the verifier, you need to ensure it's
  // suitable.  The canonicalization which happens in binding means you can
  // compare bound configs using a simple deep equals.
  if (!_.isEqual(vConfig, boundConfig)) {
    throw new Error("Unexpected configuration.");
  }

  // Verifiers should also always check that the PODs are signed by a trusted
  // authority with a known public key.
  if (vClaims.pods.weapon.signerPublicKey !== signerPublicKey) {
    throw new Error("Unexpected signer.");
  }

  // Finally the verifier can look at the revealed claims and decide what to do
  // with them.
  console.log(
    "Revealed attack value",
    vClaims.pods.weapon.entries?.attack.value
  );
  console.log(
    "Revealed watermark and nullifier",
    vClaims.owner?.nullifierHash,
    vClaims.watermark?.value
  );

  // Here's a more complicated example proving about multiple PODs and more
  // constraints.
  // In this case I'm proving I have two items from the same item set, both
  // of which I own, and I'm revealing their attack and defense stats.
  const multiPODProofConfig: GPCProofConfig = {
    pods: {
      weapon: {
        entries: {
          owner: { isRevealed: false, isOwnerID: true },
          attack: { isRevealed: true },

          // The equalsEntry constraint can refer to an entry in another
          // POD by name.
          itemSet: { isRevealed: false, equalsEntry: "armor.itemSet" }
        }
      },
      armor: {
        entries: {
          owner: { isRevealed: false, isOwnerID: true },
          defense: { isRevealed: true },

          // We could put an equalsEntry here as well, but it would be redundant.
          // The entry has to be present in the config, though, to prove it
          // exists.
          itemSet: { isRevealed: false }
        }
      }
    }
  };
  const {
    proof: multiProof,
    boundConfig: multiBoundConfig,
    revealedClaims: multiRevealedClaims
  } = await gpcProve(
    multiPODProofConfig,
    {
      pods: { weapon: podSword, armor: podShield },
      owner: { semaphoreV3: semaphoreIdentity }
    } satisfies GPCProofInputs,
    GPC_TEST_ARTIFACTS_PATH
  );
  const multiIsValid = await gpcVerify(
    multiProof,
    multiBoundConfig,
    multiRevealedClaims,
    GPC_TEST_ARTIFACTS_PATH
  );
  if (!multiIsValid) {
    throw new Error("Multi-POD proof didn't verify!");
  }
  console.log(
    "Multi-POD proof revealed attack & defense",
    multiRevealedClaims.pods.weapon.entries?.attack.value,
    multiRevealedClaims.pods.armor.entries?.defense.value
  );

  //////////////////////////////////////////////////////////////////////////////
  // A PCD which wraps GPC functionality can be found in teh @pcd/gpc-pcd
  // package.  This is a generic PCD suitable for hackers and experimenters.
  // It exposes a lot of details directly in the UI, but allows GPC proofs
  // to function end-to-end in Zupass.
  //
  // In future there will be higher-level app-specific wrappers such as a
  // ZKPODTicketPCD to provide ticket proofs with a user-friendly UI.
  //////////////////////////////////////////////////////////////////////////////

  // The GPCPCD package needs to be initialized with the path to find ZK
  // artifacts.
  await GPCPCDPackage.init?.({
    zkArtifactPath: GPC_TEST_ARTIFACTS_PATH
  });

  // POD and Semaphore Identity also need to be wrapped in PCDs at this layer.
  const podPCD = new PODPCD(uuid(), podSword);
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identity: semaphoreIdentity
  });

  // So far, the GPCPCD only supports proving about one POD, and always
  // names it "pod0" so we need a slightly different config.
  const pcdProofConfig: GPCProofConfig = {
    pods: {
      pod0: {
        entries: {
          attack: { isRevealed: true },
          owner: { isRevealed: false, isOwnerID: true }
        }
      }
    }
  };

  // We can make a GPCPCD for the same simple proof config we used above, by
  // specifying all of the prove arguments in the generic format.
  const proveArgs: GPCPCDArgs = {
    proofConfig: {
      argumentType: ArgumentTypeName.String,
      value: serializeGPCProofConfig(pcdProofConfig)
    },
    pod: {
      value: await PODPCDPackage.serialize(podPCD),
      argumentType: ArgumentTypeName.PCD
    },
    identity: {
      value: await SemaphoreIdentityPCDPackage.serialize(identityPCD),
      argumentType: ArgumentTypeName.PCD
    },
    externalNullifier: {
      value: "example nullifier",
      argumentType: ArgumentTypeName.String
    },
    watermark: {
      value: "example watermark",
      argumentType: ArgumentTypeName.String
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: uuid()
    }
  };
  const gpcPCD = await GPCPCDPackage.prove(proveArgs);
  console.log("GPCPCD has ID", gpcPCD.id);

  // The GPCPCD's claims contain the same GPCBoundConfig and GPCRevealedClaims
  // objects we used above, and its proof contains the Groth16 proof.  Thus
  // it carries all of the necessary information to verify the proof.
  const pcdIsValid = await GPCPCDPackage.verify(gpcPCD);
  if (!pcdIsValid) {
    throw new Error("GPCPCD proof didn't verify!");
  }

  // In most useful examples, proving and verifying happen across a network
  // using Zupass popups, which involves constructing prove args from a mix
  // of data from the prover and also from the requestor/verifier.  See the
  // consumer-client example in the Zupass repo for more details of that.

  console.log("**** End GPC Demo ****");
}
