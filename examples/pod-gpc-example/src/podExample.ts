/**
 * This file provides example usage of POD (Provable Object Data) libraries.
 *
 * This isn't a fleshed-out sample app, but instead a tutorial structured as
 * heavily-commented code.  The code below executes, and you can see its output
 * by running the unit tests in this package via `yarn test`.
 *
 * The code for creating and manipulating PODs is found in the @pcd/pod package.
 * The @pcd/pod-pcd package wraps a POD in a way which can be created,
 * transmitted, stored, and displayed in apps like Zupass and Podbox which
 * understand many types of PCDs.
 *
 * All the POD code is an early prototype, and details are subject to change.
 * Feedback is welcome.
 */

import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  POD,
  PODContent,
  PODEntries,
  deserializePODEntries,
  podEntriesFromSimplifiedJSON,
  podEntriesToSimplifiedJSON,
  serializePODEntries
} from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { v4 as uuid } from "uuid";

/**
 * You can run this example code with this command: yarn test
 */
export async function podDemo(): Promise<boolean> {
  console.log("**** POD Demo ****");

  //////////////////////////////////////////////////////////////////////////////
  // Prerequisites: First let's create some cryptographic data for our POD.
  //////////////////////////////////////////////////////////////////////////////

  // Semaphore is the default identity protocol for Zupass.  PODs themselves
  // don't care what you use, but ZK proofs will check POD ownership via
  // Semaphore V3 by default.  This line creates a new private identity.
  const semaphoreIdentity = new Identity();

  // The public part of a Semaphore identity is called the commitment.  It's
  // like your Semaphore user ID.
  console.log("Semaphore commitment", semaphoreIdentity.commitment);

  // The semaphore private identity is made up of a "trapdoor" and "nullifier".
  // It can be saved as a string to be restored later.
  const savedSecrets = semaphoreIdentity.toString();
  console.log("Private identity", savedSecrets);
  const sameIdentity = new Identity(savedSecrets);
  console.log("Restored identity", sameIdentity.commitment);

  //////////////////////////////////////////////////////////////////////////////
  // The libraries for manipulating PODs are found in the @pcd/pod package.
  // The code is structured in a few layers of wrapping of raw data, which
  // we'll visit bottom-up.  All the types involved are intended to be
  // immutable.
  //
  // Starting with the data, a POD is an immutable key-value store hashed and
  // signed by an issuer.  The key-value entries are represented in Typescript
  // by the PODEntries type.
  //////////////////////////////////////////////////////////////////////////////

  // Entry names are strings with a limited character set which make convenient
  // to use as variable identifiers.
  //
  // Entry values are represented by a PODValue, which includes a value and type.
  // The type controls how the value is hashed and inclued in ZK proofs.
  // The type itself is not part of the value, and is not hashed.
  // Currently supported types are "string", "int", and "cryptographic".
  //
  // Entries always get sorted when built into a Merkle tree, so the order
  // of the original input doesn't matter.
  const sampleEntries: PODEntries = {
    // String values can contain any unicode string, not limited to identifiers.
    my_favorite_dessert: { type: "string", value: "Blueberry Pie" },

    // int values are bigints with a range limited to 63-bit unsigned
    // integers.  Ints will be usable for arithmetic in ZK proofs.
    // Negative values will be supported in future, as will more integer types
    // with different sizes (like int8 or boolean).
    someNumber: { type: "int", value: 123n },

    // "cryptographic" is a bigint type for values like hashes or uniquue
    // IDs.  Each is a single field element which fits in a circuit signal,
    // meaning an integer mod p for a large (254 bit) prime.
    // In proofs, these values can be compared for equality, but not manipulated
    // arithmatically (no addition, less-than, etc).
    mySemaphoreID: {
      type: "cryptographic",

      // The commitment is the part of a Semaphore identity to include in a POD
      // to identify a user.
      value: semaphoreIdentity.commitment
    },

    // "cryptographic" entries can be small numbers too, and they behave in the
    // same way as an "int".  The type controls the range and what you can
    // do with the number, not its underlying value.
    smallCryptographic: {
      type: "cryptographic",
      value: 42n
    }
  };
  console.log("Sample entries", sampleEntries);

  // While the POD library doesn't mutate PODEntries, you can mutate the object
  // in order to build it up incrementally in your code before building a POD.
  // Once a POD is hashed and signed, the entries won't be able to change.
  const dynamicEntries: PODEntries = {};
  dynamicEntries.entry1 = { type: "string", value: "foo" };
  if (sampleEntries.someNumber.value === 7n) {
    dynamicEntries.entry2 = { type: "string", value: "bar" };
  }
  dynamicEntries.entry3 = { type: "cryptographic", value: 123n };
  console.log("Dynamic entries", dynamicEntries);

  // Inside of a POD is the PODContent class, which forms entries into a
  // Merkle tree by hashing them.  Creating a PODContent will also validate
  // that all of the entries are legal.
  const podContent = PODContent.fromEntries(sampleEntries);

  // The root of the Merkle tree is called the Content ID.
  console.log("PODContent ID", podContent.contentID);

  // PODContent is a Map-like class with accessors for getting values.
  console.log("PODContent value (with type)", podContent.getValue("someNumer"));
  console.log("PODContent raw value", podContent.getRawValue("someNumer"));

  // PODContent can generate Merkle membership proofs which prove that an entry
  // is contained in a given root.  This is the basis of the ZK proofs which
  // can be made using PODs.
  const entryProof = podContent.generateEntryProof("mySemaphoreID");
  console.log("Entry proof", entryProof);

  // PODs are signed using EdDSA signatures, which are easy to check in a
  // ZK circuit.  Our EdDSA private keys can be any 32 bytes encoded as hex.
  const privateKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  // Signing a POD is usually performed in a single step like this.  No need
  // to go through the PODContent class.
  const pod = POD.sign(sampleEntries, privateKey);
  console.log("POD content ID + signature", pod.contentID, pod.signature);
  const publicKey = pod.signerPublicKey;
  const signature = pod.signature;

  // You can get the underlying PODContent from a POD if you need it.
  console.log("POD value", pod.content.getValue("someNumer"));

  // If you already have the signature from a saved POD, you can
  // recreate it without signing again.
  const loadedPOD = POD.load(sampleEntries, signature, publicKey);
  console.log("Loaded POD content ID", loadedPOD.contentID);

  //////////////////////////////////////////////////////////////////////////////
  // POD contents can be serialized to/from strings in JSON, though not directly
  // using JSON.stringify due to the use of bigint (and more non-JSON types in
  // future).  The formats for doing so are work-in-progress and may change
  // with future feedback and features.  Backward-compatibility will be possible
  // in future, but may require some additional code at this level.  See the
  // PCD wrappers below which will handle compatibility automatically.
  //////////////////////////////////////////////////////////////////////////////

  // PODContent serializes as its entries, since the Merkle Tree can be
  // rebuilt on-demand.  The default format for entries contains full type
  // information and can reconstruct the PODEntries exactly.
  const serializedContent = podContent.serialize();
  console.log("Serialized content (full fidelity)", serializedContent);
  const deserializedContent = PODContent.deserialize(serializedContent);
  console.log("Deserialized content ID", deserializedContent.contentID);

  // The POD class also supports full-fidelity serialization, which includes
  // the signature and public key.
  const serializedPOD = pod.serialize();
  console.log("Serialized POD (full fidelity)", serializedPOD);
  const deserializedPOD = POD.deserialize(serializedPOD);
  console.log("Deserialized POD ID", deserializedPOD.contentID);

  // You can perform the same full-fidelity entry conversion directly with
  // these helper functions.
  const serializedEntries = serializePODEntries(sampleEntries);
  const deserializedEntries = deserializePODEntries(serializedEntries);
  console.log("Deserialized entries", deserializedEntries);

  // There's also a simplified JSON format which omits the types.  This
  // is optimized for human readability, and supports configured spacing
  // in the same way as JSON.stringify.
  const simplifiedJSON = podEntriesToSimplifiedJSON(sampleEntries, 2);
  console.log("Simplified JSON", simplifiedJSON);

  // When parsing simplified JSON, the types will be derived from the values.
  // This means the types might not be identical to the original entries.  The
  // content ID will still be the same, because it depends only on values.  E.g.
  // a "cryptographic" might come out as an "int", but only if its value is
  // small enough that they would behave identically.
  const entriesFromSimplified = podEntriesFromSimplifiedJSON(simplifiedJSON);
  console.log(
    "What type is a small number?",
    entriesFromSimplified.smallCryptographic
  );
  console.log(
    "ContentID from simplified JSON",
    PODContent.fromEntries(entriesFromSimplified).contentID
  );

  // For more things you can do with the @pcd/pod package, check out the
  // function documentation in pod.ts, podContent.ts, and podUtil.ts.

  //////////////////////////////////////////////////////////////////////////////
  // A POD PCD, found in the @pcd/pod-pcd package, wraps a POD and makes
  // it part of the PCD framework.  This means it can be created,
  // transmitted, stored, and displayed by generic PCD apps like Zupass
  // and Podbox.
  //////////////////////////////////////////////////////////////////////////////

  // In addition to the POD itself, all PCDs have a unique ID, which usually
  // a UUID (in theory it can be any string).
  const pcd = new PODPCD(uuid(), pod);
  console.log("PCD ID", pcd.id);

  // PCDs have their key public values in their claim field.
  console.log("PCD Claims", pcd.claim.entries, pcd.claim.signerPublicKey);

  //////////////////////////////////////////////////////////////////////////////
  // A PCD Package is a generic collection of functions for manipulating PCDs
  // of a given type in a generic way (using async functions).
  //////////////////////////////////////////////////////////////////////////////

  // All PCDs can be verified, which makes use of cryptographic info in the
  // proof field.  In this case, it's checking the signature on the content ID
  // deroved from the entries.
  console.log("PCD is valid?", await PODPCDPackage.verify(pcd));

  // PCDs can also be creatd by the "prove" interface.  This uses a more generic
  // (and more verbose) argument specification which allows requests to prove
  // to be transmitted to apps like Zupass.
  const pcd2 = await PODPCDPackage.prove({
    entries: {
      value: sampleEntries,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: privateKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: uuid(),
      argumentType: ArgumentTypeName.String
    }
  });
  console.log("PCD2 is valid?", await PODPCDPackage.verify(pcd2));

  // PCDs can also be serialized and deserialized, which is what Zupass uses
  // for storage and sync.  This layer will (in future) also handle versioning
  // and backward compatibility.
  const seralizedPCD = await PODPCDPackage.serialize(pcd);
  const deserializedPCD = await PODPCDPackage.deserialize(seralizedPCD.pcd);
  console.log("Deserialized PCD ID", deserializedPCD.id);

  // For more things you can do with the @pcd/pod-pcd package, check out
  // PODPCD.ts.  Also look at the @pcd/util package for other useful
  // helpers.

  console.log("**** End POD Demo ****");
  return true;
}
