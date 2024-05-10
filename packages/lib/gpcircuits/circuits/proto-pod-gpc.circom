pragma circom 2.1.8;

include "circomlib/circuits/gates.circom";
include "entry.circom";
include "global.circom";
include "gpc-util.circom";
include "list-membership.circom";
include "multituple.circom";
include "object.circom";
include "owner.circom";

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

    // Indicates the number of ListMembership modules included in this GPC,
    // setting the largest number of distinct membership lists for (tuples of)
    // entry values which can be checked.
    MAX_LISTS,
    
    // Indicates the maximum number of list entries for each list membership check.
    MAX_LIST_ELEMENTS,

    // Indicates the number of tuples included in this GPC, setting the
    // largest number of distinct tuples which can be expressed.
    MAX_TUPLES,

    // Indicates the arity (i.e. width or size) of the each tuple, e.g.
    // TUPLE_ARITY = 2 for pairs or TUPLE_ARITY = 3 for triples.
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
    signal output ownerRevealedNullifierHash <== OwnerModuleSemaphoreV3()(
        enabled <== ownerIsEnabled,
        identityNullifier <== ownerSemaphoreV3IdentityNullifier,
        identityTrapdoor <== ownerSemaphoreV3IdentityTrapdoor,
        identityCommitment <== InputSelector(MAX_ENTRIES)(entryValue, ownerIsEnabled * ownerEntryIndex),
        externalNullifier <== ownerExternalNullifier,
        isNullfierHashRevealed <== ownerIsNullfierHashRevealed
    );

    /*
     * 1 MultiTupleModule with its inputs & outputs.
     */

    // Array of indices of elements forming the desired tuples (cf. MultiTupleModule).
    signal input tupleIndices[MAX_TUPLES][TUPLE_ARITY];

    // Hashes representing these tuples.
    signal tupleHashes[MAX_TUPLES] <== MultiTupleModule(MAX_TUPLES, TUPLE_ARITY, MAX_ENTRIES)(entryValueHashes, tupleIndices);
    
    /*
     * (MAX_LISTS) ListMembershipModules with their inputs & outputs.
     */

    // Index of entry value (if less than `MAX_ENTRIES`) or tuple hash that ought to be a member
    // of the ith list.
    // This is equal to -1 wherever a list membership check is not required, which has the effect of
    // checking that the value 0 is a member of the list of valid values, which should also be set
    // to a list of zeroes to match.
    signal input listComparisonValueIndex[MAX_LISTS];

    // List of accepted values for membership checks. Depending on the indices above, these need to
    // match element value hashes, tuple hashes, or a constant value of 0 for disabled checks.
    signal input listValidValues[MAX_LISTS][MAX_LIST_ELEMENTS];

    // Indicators of whether the list membership checks pass.
    signal isMember[MAX_LISTS];

    for (var i = 0; i < MAX_LISTS; i++) {
        isMember[i] <== ListMembershipModule(MAX_LIST_ELEMENTS)(
            MaybeInputSelector(MAX_ENTRIES + MAX_TUPLES)(
                Append(MAX_ENTRIES, MAX_TUPLES)(entryValueHashes, tupleHashes),
                listComparisonValueIndex[i]),
            listValidValues[i]);

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
