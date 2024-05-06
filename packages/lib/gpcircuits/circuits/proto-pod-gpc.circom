pragma circom 2.1.8;

include "circomlib/circuits/gates.circom";
include "entry.circom";
include "global.circom";
include "gpc-util.circom";
include "list-membership.circom";
include "object.circom";
include "owner.circom";
include "tuple.circom";

/**
 * This template is the top level of a prototype GPC proof.  Its template parameters are
 * the sizing parameters which define a GPC family.  Its inputs define the
 * POD objects to be proven, as well as configuring the proof.
 * 
 * There shouldn't be any "real" logic in this template, only interconnection of modules,
 * plus input/output handling.
 */
template ProtoPODGPC (
  // Indicates the number of Object modules included in this GPC, setting the
  // largest number of distinct PODs which can be expressed.  This sets the
  // size of inputs with the `object` prefix (whether arrays or bitfields).
  MAX_OBJECTS,

  // Indicates the number of Entry modules included in this GPC, setting the
  // largest number of distinct POD entries which can be expressed.  These
  // can be flexibly assigned to objects using the entryObjectIndex.  This
  // sets the size of inputs with the `entry` prefix (whether arrays or
  // bitfields).
  MAX_ENTRIES,
  
  // Max depth of the Merkle proof that this entry appears in a POD.  This
  // determines the size of the entryProofSiblings array input, and places an
  // inclusive upper bound on the proofDepth input.
  MERKLE_MAX_DEPTH,

  // Indicates the maximum number of membership lists
  MAX_LISTS,
  
  // Indicates the maximum number of list entries for the list membership check.
  MAX_LIST_ENTRIES,

  // Indicates the maximum number of tuples to generate.
  MAX_TUPLES,

  // Indicates the arity of the tuples.
  TUPLE_ARITY
) {
  /*
   * 1+ ObjectModules.  Each array corresponds to one input/output for each object module.
   */

  // Root hash of each object's Merkle tree representation
  signal input objectContentID[MAX_OBJECTS];

  // Signer of each object: EdDSA public key
  signal input objectSignerPubkeyAx[MAX_OBJECTS], objectSignerPubkeyAy[MAX_OBJECTS];

  // Signature of each object: EdDSA signaure
  signal input objectSignatureR8x[MAX_OBJECTS], objectSignatureR8y[MAX_OBJECTS], objectSignatureS[MAX_OBJECTS];

  // Object module validates that the object's root is properly signed.
  for (var objectIndex = 0; objectIndex < MAX_OBJECTS; objectIndex++) {
    ObjectModule()(
      contentID <== objectContentID[objectIndex],
      signerPubkeyAx <== objectSignerPubkeyAx[objectIndex],
      signerPubkeyAy <== objectSignerPubkeyAy[objectIndex],
      signatureR8x <== objectSignatureR8x[objectIndex],
      signatureR8y <== objectSignatureR8y[objectIndex],
      signatureS <== objectSignatureS[objectIndex]
    );
  }

  // TODO(POD-P3): Provide a way to (optionally?) ensure objects are unique
  // (comparing content IDs, or signers, or signatures).

  /*
   * 1+ EntryModule & EntryConstraintModule for each entry.
   * Each array corresponds to one input/output for each entry module.  Non-array inputs
   * are packed bits, which will be split between modules within the circuit.
   */

  // Object index containing each entry.
  signal input entryObjectIndex[MAX_ENTRIES];

  // Entry name (by hash) and value.  Value's hash is implicitly included as 1st sibling.
  signal input entryNameHash[MAX_ENTRIES], entryValue[MAX_ENTRIES];
  
  // Boolean flags for entry value behavior.
  signal input entryIsValueEnabled /*MAX_ENTRIES packed bits*/, entryIsValueHashRevealed /*MAX_ENTRIES packed bits*/;
  signal entryIsValueEnabledBits[MAX_ENTRIES] <== Num2Bits(MAX_ENTRIES)(entryIsValueEnabled);
  signal entryIsValueHashRevealedBits[MAX_ENTRIES] <== Num2Bits(MAX_ENTRIES)(entryIsValueHashRevealed);

  // Merkle proof of entry name's membership in the object's Merkle tree.
  signal input entryProofDepth[MAX_ENTRIES], entryProofIndex[MAX_ENTRIES] /*MERKLE_MAX_DEPTH packed bits*/ , entryProofSiblings[MAX_ENTRIES][MERKLE_MAX_DEPTH];

  // Entry value is optionally revealed, or set to -1 if not.
  signal output entryRevealedValueHash[MAX_ENTRIES];

  // Convenience value: entry value hashes are present as first sibling of each entry proof.
  signal entryValueHashes[MAX_ENTRIES];
  for (var i = 0; i < MAX_ENTRIES; i++) {
    entryValueHashes[i] <== entryProofSiblings[i][0];
  }

  // Entry can be compared for equality (by hash) to another entry (by index).
  // This can be disabled by comparing to self: entryEqualToOtherEntryIndex[i] = i
  signal input entryEqualToOtherEntryByIndex[MAX_ENTRIES];

  // Modules which scale with number of entries.
  for (var entryIndex = 0; entryIndex < MAX_ENTRIES; entryIndex++) {
    // Entry module proves that an entry exists within the object's merkle tree.
    entryRevealedValueHash[entryIndex] <== EntryModule(MERKLE_MAX_DEPTH)(
      objectContentID <== InputSelector(MAX_OBJECTS)(objectContentID, entryObjectIndex[entryIndex]),
      nameHash <== entryNameHash[entryIndex],
      isValueHashRevealed <== entryIsValueHashRevealedBits[entryIndex],
      value <== entryValue[entryIndex],
      isValueEnabled <== entryIsValueEnabledBits[entryIndex],
      proofDepth <== entryProofDepth[entryIndex],
      proofIndex <== entryProofIndex[entryIndex],
      proofSiblings <== entryProofSiblings[entryIndex]
    );

    // EntryConstraint module contains constraints applied to each individual entry.
    EntryConstraintModule(MAX_ENTRIES)(
      valueHash <== entryProofSiblings[entryIndex][0],
      entryValueHashes <== entryValueHashes,
      equalToOtherEntryByIndex <== entryEqualToOtherEntryByIndex[entryIndex]
    );
  }

  /*
   * 1 OwnerModule with its inputs & outputs.
   */

  // Entry containing owner's Semaphore V3 commitment (public), or -1 to disable ownership checking.
  signal input ownerEntryIndex;

  // Owner's Semaphore V3 identity (private key) kept hidden and verified.
  signal input ownerSemaphoreV3IdentityNullifier, ownerSemaphoreV3IdentityTrapdoor;

  // Final nullifier hash is calculated based on external nullifier and owner's identity.
  signal input ownerExternalNullifier, ownerIsNullfierHashRevealed;

  // Owner module verifies owner's ID, and generates nullifier.
  signal ownerIsEnabled <== NOT()(IsZero()(ownerEntryIndex + 1));
  signal output ownerRevealedNulifierHash <== OwnerModuleSemaphoreV3()(
    enabled <== ownerIsEnabled,
    identityNullifier <== ownerSemaphoreV3IdentityNullifier,
    identityTrapdoor <== ownerSemaphoreV3IdentityTrapdoor,
    identityCommitment <== InputSelector(MAX_ENTRIES)(entryValue, ownerIsEnabled * ownerEntryIndex),
    externalNullifier <== ownerExternalNullifier,
    isNullfierHashRevealed <== ownerIsNullfierHashRevealed
  );

  /*
   * 1 TupleModule with its inputs & outputs.
   */

  // Total number of entries and tuples.
  var numEntriesAndTuples = MAX_ENTRIES + MAX_TUPLES;
  
  signal input tupleIndices[MAX_TUPLES][TUPLE_ARITY];

  // Tuple hashes to be passed on to other modules.
  signal tupleHashes[MAX_TUPLES];

  // Components for computing forming the ith tuple
  // from the indices in `tupleIndices[i]` that
  // refer to elements of
  // `entryHashes.concat(tupleHashes.slice(0,i))`.
  component TupleHasher[MAX_TUPLES];

  for (var i = 0; i < MAX_TUPLES; i++) {
	  // Let the hasher be the tuple module expecting
	  // `MAX_ENTRIES + i` values to choose from.
	  TupleHasher[i] = TupleModule(TUPLE_ARITY, MAX_ENTRIES + i);

	  // Select the ith set of indices from `tupleIndices`.
	  TupleHasher[i].tupleIndices <== tupleIndices[i];

	  // Feed in the value hashes
	  for (var j = 0; j < MAX_ENTRIES; j++) {
	    TupleHasher[i].value[j] <== entryValueHashes[j];
	  }

	  // ...and the first `i` tuple hashes.
	  for (var j = 0; j < i; j++) {
	    TupleHasher[i].value[MAX_ENTRIES + j] <== tupleHashes[j];
	  }

	  // Return the output.
	  tupleHashes[i] <== TupleHasher[i].tupleHash;
  }
  
  /*
   * 1 ListMembershipModule with its inputs & outputs.
   */

  // Index of entry value (if less than `MAX_ENTRIES`) or tuple hash that ought to be a member
  // of the ith list.
  // This is equal to -1 if the list membership check is disabled.
  signal input memberIndex[MAX_LISTS];

  // Membership list.
  signal input membershipList[MAX_LISTS][MAX_LIST_ENTRIES];

  signal memberHash[MAX_LISTS];
  signal isMember[MAX_LISTS];

  for (var i = 0; i < MAX_LISTS; i++) { 
	  memberHash[i] <== MaybeInputSelector(numEntriesAndTuples)(
	    Append(MAX_ENTRIES, MAX_TUPLES)(entryValueHashes, tupleHashes),
	    memberIndex[i]);
	  
	  isMember[i] <== ListMembershipModule(MAX_LIST_ENTRIES)(
	    memberHash[i], membershipList[i]);

	  isMember[i] === 1;
  }
  
  /*
   * 1 GlobalModule with its inputs & outputs.
   */

  // Watermark is an arbitrary value used to uniquely identify a proof.
  signal input globalWatermark;

  // Catch-all for logic global to the circuit, not tied to any of the other modules above.
  GlobalModule()(globalWatermark);
}
