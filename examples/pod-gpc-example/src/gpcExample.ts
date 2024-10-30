/**
 * This file provides example usage of GPC (General Purpose Circuits) libraries
 * to make proofs about PODs (Provable Object Data).  See podExample.ts for
 * an intro to the POD datatype used in GPCs.
 *
 * This isn't a fleshed-out sample app, but instead a tutorial structured as
 * heavily-commented code.  The code below executes, and you can see its output
 * by running the unit tests in this package via `yarn test`.
 *
 * The code for creating and verifying GPC proofs PODs is found in the @pcd/gpc
 * package.  The @pcd/gpc-pcd package wraps a GPC proof in a way which can be
 * created, transmitted, stored, and displayed in apps like Zupass and
 * Podbox which understand many types of PCDs.
 *
 * All the GPC code is an early prototype, and details are subject to change.
 * Feedback is welcome.
 */

import {
  GPCProofConfig,
  GPCProofInputs,
  boundConfigFromJSON,
  boundConfigToJSON,
  gpcArtifactDownloadURL,
  gpcBindConfig,
  gpcProve,
  gpcVerify,
  proofConfigToJSON,
  revealedClaimsFromJSON,
  revealedClaimsToJSON
} from "@pcd/gpc";
import { GPCPCDArgs, GPCPCDPackage } from "@pcd/gpc-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { POD, PODEntries } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import _ from "lodash";
import * as path from "path";
import { v4 as uuid } from "uuid";

/**
 * You can run this example code with this command: yarn test
 */
export async function gpcDemo(): Promise<boolean> {
  console.log("**** GPC Demo ****");

  //////////////////////////////////////////////////////////////////////////////
  // Prerequisites: First let's create some PODs to prove about.  This
  // duplicates many steps from the POD demo, so see that file for more detailed
  // explanatory comments.
  //////////////////////////////////////////////////////////////////////////////

  const privateKey = "ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8";
  const semaphoreIdentity = new Identity();
  console.log("Semaphore commitment", semaphoreIdentity.commitment);
  const podSword = POD.sign(
    {
      pod_type: { type: "string", value: "myrpg.item.weapon" },
      itemSet: { type: "string", value: "celestial" },
      attack: { type: "int", value: 7n },
      weaponType: { type: "string", value: "sword" },
      isMagical: { type: "boolean", value: true },
      owner: { type: "cryptographic", value: semaphoreIdentity.commitment }
    } satisfies PODEntries,
    privateKey
  );
  console.log("Sword", podSword.content.toJSON());
  const podShield = POD.sign(
    {
      pod_type: { type: "string", value: "myrpg.item.shield" },
      itemSet: { type: "string", value: "celestial" },
      defense: { type: "int", value: 5n },
      isMagical: { type: "boolean", value: true },
      owner: { type: "cryptographic", value: semaphoreIdentity.commitment }
    } satisfies PODEntries,
    privateKey
  );
  console.log("Shield", podShield.content.toJSON());
  const signerPublicKey = podSword.signerPublicKey;

  //////////////////////////////////////////////////////////////////////////////
  // The libraries for proving GPCs are found in the @pcd/gpc package.
  // A lot of documentation can befound on the types in the gpcTypes.ts module.
  // The primary public interface is found in the gpc.ts module.
  // All the types involved are treated as immutable, but you can manipulate
  // them freely before passing them to library functions.
  //
  // The purpose of the GPC library is to hide the details of the ZK circuits
  // used to generate and verify proofs.  Proofs can be created using a
  // high-level configuration, and the library will automatically pick a
  // suitable circuit from many available circuits from a GPC family.
  //////////////////////////////////////////////////////////////////////////////

  // A GPCConfig specifies what we want to prove about one or more PODs.  It's
  // intended to be reusable to generate multiple proofs.  This is a simple
  // proof of a single POD.
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
          // revealing it, but will be proving I own the corresponding
          // Semaphore V3 identity secrets.
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" }
        }
      }
    }
  };

  // Note that anything not mentioned in the config isn't being proven
  // or revealed.  For instance, I didn't check the `pod_type`, so this config
  // could be met by some other type with a "damage" field.  My POD also may or
  // may not have many other entries not included in the proof.

  // To generate a proof I need to pair a config with a set of inputs, including
  // the POD(s) to prove about.  Inputs can also enable extra security features
  // of the proof.
  const simpleProofInputs: GPCProofInputs = {
    pods: {
      // The name "weapon" here matches this POD with the config above.
      weapon: podSword
    },

    owner: {
      // Here I provide my private identity info.  It's never revealed in the
      // proof, but used to prove the correctness of the `owner` entry as
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

  //////////////////////////////////////////////////////////////////////////////
  // In order to generate and verify a proof we also need certain binary
  // artifacts (proving key, verification key, and witness generator).
  // These are a part of the GPC library, generated for each of a family
  // of related circuits.
  // Since artifacts are large, and you only need a few of them to generate or
  // verify a proof, they are published in a separate NPM package.  You can
  // either depend on this package directly, or download individual artifact
  // files from it.
  //////////////////////////////////////////////////////////////////////////////

  // Artifacts can be loaded from a file (in Node) or downloaded from a URL (in
  // browser).  Here we're using artifacts fetched from NPM as a devDependency.
  const GPC_ARTIFACTS_PATH = path.join(
    __dirname,
    "../../../node_modules/@pcd/proto-pod-gpc-artifacts"
  );
  console.log("Local artifacts path", GPC_ARTIFACTS_PATH);

  // If this code were running in a browser, we'd need a URL to download
  // artifacts.  We can get one from the function below, to use in a browser,
  // or to download separately into your own Node environment.
  const artifactsURL = gpcArtifactDownloadURL("jsdelivr", "prod", undefined);
  console.log("In browser we'd download artifacts from", artifactsURL);

  //////////////////////////////////////////////////////////////////////////////
  // Let's look at how to generate a proof, and what its outputs mean.
  //////////////////////////////////////////////////////////////////////////////

  // Now that we have all the arguments ready, we can generate a proof.
  const { proof, boundConfig, revealedClaims } = await gpcProve(
    simpleProofConfig,
    simpleProofInputs,
    GPC_ARTIFACTS_PATH
  );

  // The proof object is the mathematical proof of the configured properties.
  // It's just a bunch of opaque numbers.
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
  console.log(
    "Revealed claims",
    JSON.stringify(revealedClaimsToJSON(revealedClaims), null, 2)
  );

  //////////////////////////////////////////////////////////////////////////////
  // The outputs of proving function are also the inputs to verification.
  // In many cases, these objects would be transmitted from prover to verifier
  // via the network.  See below for more details on serialization, but for
  // now let's look directly at verification.
  //////////////////////////////////////////////////////////////////////////////

  // With these same 3 inputs (and the ZK artifacts) we can verify the proof.
  // This includes verifying all the revealed entries, along with the watermark
  // and nullifier.
  const isValid = await gpcVerify(
    proof,
    boundConfig,
    revealedClaims,
    GPC_ARTIFACTS_PATH
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
  if (!_.isEqual(boundConfig, manualBoundConfig)) {
    throw new Error("Unexpected configuration.");
  }

  // Verifiers should also always check that the PODs are signed by a trusted
  // authority with a known public key.
  if (revealedClaims.pods.weapon.signerPublicKey !== signerPublicKey) {
    throw new Error("Unexpected signer.");
  }

  // Finally the verifier can look at the revealed claims and decide what to do
  // with them.
  console.log(
    "Revealed attack value",
    revealedClaims.pods.weapon.entries?.attack.value
  );
  console.log(
    "Revealed watermark and nullifier",
    revealedClaims.owner?.nullifierHashV3,
    revealedClaims.watermark?.value
  );

  //////////////////////////////////////////////////////////////////////////////
  // The proof outputs can be serialized for transmission between prover and
  // verifier.
  //////////////////////////////////////////////////////////////////////////////

  // Proof config (bound or unbound) and revealed claims can be converted to
  // a JSON-compatible form to be serialized.
  // The proof itself is already a simple JSON object.
  // In most cases, they'd be sent from prover to verifier across the network,
  // so the prover would serialize them something like this:
  const serializedGPC = JSON.stringify({
    proof: proof,
    config: boundConfigToJSON(boundConfig),
    revealed: revealedClaimsToJSON(revealedClaims)
  });

  // Then the verifier would deserialize the like this.
  // Deserializing also validates their structure, though not (yet) the
  // correctness of the proof.
  const deserializedGPC = JSON.parse(serializedGPC);
  const vProof = deserializedGPC.proof;
  const vConfig = boundConfigFromJSON(deserializedGPC.config);
  const vClaims = revealedClaimsFromJSON(deserializedGPC.revealed);
  if (
    !_.isEqual(vProof, proof) ||
    !_.isEqual(vConfig, boundConfig) ||
    !_.isEqual(vClaims, revealedClaims)
  ) {
    throw new Error("Serialization should maintain contents.");
  }

  //////////////////////////////////////////////////////////////////////////////
  // Here's a more complicated example proving about multiple PODs and more
  // constraints.  This example isn't exhaustive.  Check out the type
  // documentation for GPCProofConfig to see the current options.  Even more
  // options will be coming in future.
  //////////////////////////////////////////////////////////////////////////////

  // For my app logic here, I'm proving I have two items from a matching item
  // set, that one of them is from an acceptable list of weapon types, and
  // revealing their attack and defense stats.  For security, I'm proving
  // that I own both PODs, and attaching a watermark.
  const multiPODProofConfig: GPCProofConfig = {
    pods: {
      weapon: {
        entries: {
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" },
          attack: { isRevealed: true },

          // The equalsEntry constraint can refer to an entry in another
          // POD by name.
          itemSet: { isRevealed: false, equalsEntry: "armor.itemSet" },

          // The isMemberOf configuration proves this entry is one of the
          // members of a list, specified in the inputs below.
          weaponType: { isRevealed: false, isMemberOf: "acceptedWeaponTypes" }
        }
      },
      armor: {
        entries: {
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" },
          defense: { isRevealed: true },

          // We could put an equalsEntry here as well, but it would be redundant.
          // The entry has to be present in the config, though, to prove it
          // exists.
          itemSet: { isRevealed: false }
        }
      }
    }
  };

  // Here I generate the proof and also specify the inputs.
  const {
    proof: multiProof,
    boundConfig: multiBoundConfig,
    revealedClaims: multiRevealedClaims
  } = await gpcProve(
    multiPODProofConfig,
    {
      pods: { weapon: podSword, armor: podShield },
      owner: { semaphoreV3: semaphoreIdentity },
      membershipLists: {
        acceptedWeaponTypes: [
          { type: "string", value: "dagger" },
          { type: "string", value: "mace" },
          { type: "string", value: "sword" }
        ]
      },
      watermark: { type: "string", value: "matched item check" }
    } satisfies GPCProofInputs,
    GPC_ARTIFACTS_PATH
  );

  // And finally I can verify the proof.
  const multiIsValid = await gpcVerify(
    multiProof,
    multiBoundConfig,
    multiRevealedClaims,
    GPC_ARTIFACTS_PATH
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
  // A PCD which wraps GPC functionality can be found in the @pcd/gpc-pcd
  // package.  This allows GPC proofs to be generated and verified in Zupass
  // and other apps which use the PCD SDK.
  //
  // GPCPCD is a generic PCD suitable for hackers and experimenters.  It
  // exposes a lot of details directly in the UI.  Some user scenarios will be
  // best served by higher-level app-specific wrappers with user-friendly UI,
  // such as a ZK proof of PODTickets.
  //////////////////////////////////////////////////////////////////////////////

  // The GPCPCD package needs to be initialized with the path to find ZK
  // artifacts, same as was used above.
  await GPCPCDPackage.init?.({
    zkArtifactPath: GPC_ARTIFACTS_PATH
  });

  // POD and Semaphore Identity are also contained in PCDs at this layer.
  const swordPODPCD = new PODPCD(uuid(), podSword);
  const shieldPODPCD = new PODPCD(uuid(), podShield);
  const identityPCD = await SemaphoreIdentityPCDPackage.prove({
    identityV3: semaphoreIdentity
  });

  // The GPCPCD allows us to prove about an arbitrary number of PODs.
  const pcdProofConfig: GPCProofConfig = {
    pods: {
      swordPOD: {
        entries: {
          attack: { isRevealed: true },
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" }
        }
      },
      shieldPOD: {
        entries: {
          defense: { isRevealed: true },
          owner: { isRevealed: false, isOwnerID: "SemaphoreV3" }
        }
      }
    }
  };

  // We can make a GPCPCD for the same simple proof config we used above, by
  // specifying all of the prove arguments.  This generic format is a bit
  // verbose, but allows proof args to be passed to a Zupass popup to request
  // any sort of proof.
  const proveArgs: GPCPCDArgs = {
    proofConfig: {
      argumentType: ArgumentTypeName.Object,
      value: proofConfigToJSON(pcdProofConfig)
    },
    pods: {
      value: {
        swordPOD: {
          value: await PODPCDPackage.serialize(swordPODPCD),
          argumentType: ArgumentTypeName.PCD
        },
        shieldPOD: {
          value: await PODPCDPackage.serialize(shieldPODPCD),
          argumentType: ArgumentTypeName.PCD
        }
      },
      argumentType: ArgumentTypeName.RecordContainer
    },
    identity: {
      value: await SemaphoreIdentityPCDPackage.serialize(identityPCD),
      argumentType: ArgumentTypeName.PCD
    },
    externalNullifier: {
      value: "example nullifier",
      argumentType: ArgumentTypeName.Object
    },
    membershipLists: {
      argumentType: ArgumentTypeName.Object
    },
    watermark: {
      value: {
        cryptographic:
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
      },
      argumentType: ArgumentTypeName.Object
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
  return true;
}
