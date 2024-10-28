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
 * The POD format is stable, and the libraries are in beta, but new features are
 * still in development.  Feedback is welcome.
 */

import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  encodePublicKey,
  POD,
  PODContent,
  PODEntries,
  podEntriesFromJSON,
  podEntriesToJSON,
  podValueFromJSON,
  podValueToJSON
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
  // Semaphore V4 by default (Semaphore V3 is also available).  This line
  // creates a new private identity.
  const semaphoreIdentity = new Identity();

  // A Semaphore identity is a keypair, so the user can be identified by their
  // public key.  In Zupass, public keys are encoded in a string which can be
  // thought of as your user ID.  Some protocols instead use a commitment
  // which is the hash of the public key.
  console.log(
    "Semaphore public key",
    encodePublicKey(semaphoreIdentity.publicKey)
  );

  // The semaphore private identity is the corresponding private key.
  // It can be saved as a string to be restored later.
  const savedSecrets = semaphoreIdentity.export();
  console.log("Private key", savedSecrets);
  const sameIdentity = Identity.import(savedSecrets);
  console.log("Restored identity", encodePublicKey(sameIdentity.publicKey));

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

  // Entry names are strings with a limited character set which make them
  // convenient to use as variable identifiers.
  //
  // Entry values are represented by a PODValue, which includes a value and type.
  // The type controls how the value is hashed and included in ZK proofs.
  // The type itself is not part of the value, and is not hashed.
  //
  // Entries always get sorted when they are built into a Merkle tree, so the
  // order of the original input doesn't matter.
  const sampleEntries: PODEntries = {
    // String values can contain any unicode string, not limited to identifiers.
    my_favorite_dessert: { type: "string", value: "Blueberry Pie" },

    // Raw byte values are also supported, and behave much like strings.
    // A string is considered equal to a bytes value with its utf8 encoding.
    blob: { type: "bytes", value: new Uint8Array([1, 2, 3]) },

    // int values are bigints with a range limited to 64-bit signed integers.
    // Ints are usable for range checks and ordering (lessThan, etc) in
    // ZK proofs.
    someNumber: { type: "int", value: -123n },

    // "cryptographic" is a bigint type for values like hashes or unique
    // IDs.  Each can hold up to 254 bits (unsigned) because it is limited to a
    // single field element in circuits (meaning an integer mod some large
    // prime).  In proofs, these values can be compared for equality, but not
    // manipulated arithmetically (no ranges, lessThan, etc).
    someHash: {
      type: "cryptographic",
      value: 0x1ec239f6c8aef0662b01ce7238c1d73f7fb9e4135a58e726dd86ee59e160f01bn
    },

    // "cryptographic" entries can be small numbers too, and they are considered
    // equal to an "int" with the same value.  The type controls the range and
    // what you can do with the number, not its underlying meaning.
    smallCryptographic: {
      type: "cryptographic",
      value: 42n
    },

    // There are convenience types which act like special int values,
    // with different valid ranges and Typescript typing.
    bool: { type: "boolean", value: true },
    creationDate: { type: "date", value: new Date() },

    // Ownership of PODs is usually specified using a user's EdDSA public key,
    // which matches Semaphore V4.  The name of the owner entry is arbitrary,
    // and can be configured in proofs.
    ownerPublicKey: {
      type: "eddsa_pubkey",
      value: encodePublicKey(semaphoreIdentity.publicKey)
    },

    // Null values can be used as placeholders, or to ZK prove that an entry
    // doesn't have any other value.  A null entry is not the same as a
    // missing entry.
    optionalValue: { type: "null", value: null }
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
  // that all of the entries are are well-formed and have legal values.
  const podContent = PODContent.fromEntries(sampleEntries);

  // The root of the Merkle tree is called the Content ID.
  console.log("PODContent ID", podContent.contentID);

  // PODContent is a Map-like class with accessors for getting values.
  console.log(
    "PODContent value (with type)",
    podContent.getValue("someNumber")
  );
  console.log("PODContent raw value", podContent.getRawValue("someNumber"));

  // PODContent can generate Merkle membership proofs which prove that an entry
  // is contained in a given root.  This is the basis of the ZK proofs which
  // can be made using PODs.
  const entryProof = podContent.generateEntryProof("someHash");
  console.log("Entry proof", entryProof);

  // PODs are signed using EdDSA signatures, which are easy to check in a
  // ZK circuit.  Private keys can be any 32 bytes encoded as Base64 or hex.
  const signerPrivateKey = "ASNFZ4mrze8BI0VniavN7wEjRWeJq83vASNFZ4mrze8";

  // Signing a POD is usually performed in a single step like this.  No need
  // to go through the PODContent class.
  const pod = POD.sign(sampleEntries, signerPrivateKey);
  console.log("POD content ID + signature", pod.contentID, pod.signature);
  const signerPublicKey = pod.signerPublicKey;
  const signature = pod.signature;

  // You can get the underlying PODContent from a POD if you need it.
  console.log("POD value", pod.content.getValue("someNumber"));

  // If you already have the signature from a saved POD, you can
  // recreate it without signing again.
  const loadedPOD = POD.load(sampleEntries, signature, signerPublicKey);
  console.log("Loaded POD content ID", loadedPOD.contentID);

  //////////////////////////////////////////////////////////////////////////////
  // POD contents can be serialized to/from a JSON-compatible format, which can
  // then stringified and parsed using standard JavaScript techniques.  This
  // format is optimized to be short and human-readable, but maintains full
  // type information.
  //
  // The formats is a work-in-progress and may change with future feedback and
  // features.  Backward-compatibility will be possible in future in future, but
  // may require some additional code at this level to specify which format
  // version to use.  See the PCD wrappers below which will handle compatibility
  // automatically.
  //////////////////////////////////////////////////////////////////////////////

  // PODContent serializes as just its entries, since the Merkle Tree can be
  // rebuilt on-demand.
  const jsonContent = podContent.toJSON();
  console.log("JSON content", jsonContent);
  const stringifiedContent = JSON.stringify(jsonContent);
  console.log("Stringified content", stringifiedContent);
  const deserializedContent = PODContent.fromJSON(
    JSON.parse(stringifiedContent)
  );
  console.log("Deserialized content ID", deserializedContent.contentID);

  // The POD class also supports JSON serialization, which includes
  // the signature and public key.
  const jsonPOD = pod.toJSON();
  console.log("JSON POD", jsonPOD);
  const stringifiedPOD = JSON.stringify(jsonPOD);
  console.log("Stringified POD", stringifiedPOD);
  const deserializedPOD = POD.fromJSON(JSON.parse(stringifiedPOD));
  console.log("Deserialized POD ID", deserializedPOD.contentID);

  // You can perform the same JSON conversion on entries or values directly with
  // these helper functions.
  const stringifiedEntries = JSON.stringify(podEntriesToJSON(sampleEntries));
  const deserializedEntries = podEntriesFromJSON(
    JSON.parse(stringifiedEntries)
  );
  console.log("Deserialized entries", deserializedEntries);
  const stringifiedValue = JSON.stringify(
    podValueToJSON(sampleEntries.my_favorite_dessert)
  );
  const deserializedValue = podValueFromJSON(JSON.parse(stringifiedValue));
  console.log("Deserialized value", deserializedValue);

  // For more things you can do with the @pcd/pod package, check out the
  // function documentation in pod.ts, podContent.ts, podTypes.ts, etc.

  //////////////////////////////////////////////////////////////////////////////
  // A POD PCD, found in the @pcd/pod-pcd package, wraps a POD and makes
  // it part of the PCD framework.  This means it can be created,
  // transmitted, stored, and displayed by apps like Zupass and Podbox.
  //////////////////////////////////////////////////////////////////////////////

  // In addition to the POD itself, all PCDs have a unique ID, which usually
  // a UUID (though it can be any string).
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
  // derived from the entries.
  console.log("PCD is valid?", await PODPCDPackage.verify(pcd));

  // PCDs can also be created by the "prove" interface.  This uses a more
  // generic (and more verbose) argument specification which allows requests to
  // prove to be transmitted to apps like Zupass.  All the arguments must be
  // JSON-compatible to be transmitted.
  const pcd2 = await PODPCDPackage.prove({
    entries: {
      value: podEntriesToJSON(sampleEntries),
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: signerPrivateKey,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: uuid(),
      argumentType: ArgumentTypeName.String
    }
  });
  console.log("PCD2 is valid?", await PODPCDPackage.verify(pcd2));

  // PCDs can also be serialized and deserialized, which is what Zupass uses
  // for storage and sync.  This layer also handles versioning and backward
  // compatibility.
  const serializedPCD = await PODPCDPackage.serialize(pcd);
  const deserializedPCD = await PODPCDPackage.deserialize(serializedPCD.pcd);
  console.log("Deserialized PCD ID", deserializedPCD.id);

  // For more things you can do with the @pcd/pod-pcd package, check out
  // PODPCD.ts.  Also look at the @pcd/util package for other useful
  // helpers.

  console.log("**** End POD Demo ****");
  return true;
}
