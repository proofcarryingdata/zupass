pragma circom 2.1.8;

include "@zk-kit/binary-merkle-root.circom/src/binary-merkle-root.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/comparators.circom";
include "gpc-util.circom";

/**
 * Module constraining a single entry of POD object.  It proves the inclusion
 * of a named entry, and optionally constrains or reveals information about
 * the entry value.
 * 
 * This module's functionality is always enabled.  Unused modules can be
 * populated with duplicate constraint-satisfying values from used modules.
 *
 * Boolean signals are assumed (but not constrained) to be 0 or 1.
 * They will usually be implicitly constrained when they are unpacked using
 * Num2Bits.
 */
template EntryModule (
    // Max depth of the Merkle proof that this entry appears in a POD.  This
    // determines the size of the proofSiblings array input, and places an inclusive
    // upper bound on the proofDepth input.
    MERKLE_MAX_DEPTH
) {
    // Content ID is the root of the Merkle proof, while name hash is its leaf.
    signal input objectContentID, nameHash;

    // Value hash (first sibling to the name) can be optionally revealed.  Revealing plaintext
    // value is left for PCD code outside the circuit.
    signal input isValueHashRevealed;
    // Checked by Num2Bits externally: isValueHashRevealed * (1 - isValueHashRevealed) === 0;

    // Merkle proof of the entry name.  Sibling 0 is the corresponding value hash.    
    signal input proofDepth, proofIndex, proofSiblings[MERKLE_MAX_DEPTH];

    // Verify Merkle membership proof against specified object root.
    signal proofIndices[MERKLE_MAX_DEPTH] <== Num2Bits(MERKLE_MAX_DEPTH)(proofIndex);
    signal proofRoot <== BinaryMerkleRoot(MERKLE_MAX_DEPTH)(
        leaf <== nameHash,
        depth <== proofDepth,
        indices <== proofIndices,
        siblings <== proofSiblings
    );
    objectContentID === proofRoot;

    // Revealed value hash output gets hash or -1 depending on configuration.
    signal output revealedValueHash <== ValueOrNegativeOne()(proofSiblings[0], isValueHashRevealed);
}

/**
 * Module containing per-entry configurable constraints.  This is an adjunct
 * to an EntryModule, and assumes the input about this and other entries is already
 * validated by such a module.
 * 
 * No overall enable flag, but can be disabled by setting constraints to compare to
 * itself.
 * 
 * Index is constrained to be within the range [0, MAX_ENTRIES). 
 */
template EntryConstraintModule(
    // Indicates the number of Entry modules included in this GPC, which is
    // needed here to allow referring to other entries in the entryValueHashes
    // input array.
    MAX_ENTRIES
) {
    // Identifying info about this entry itself, validated separately by EntryModule.
    signal input valueHash;

    // Other entries for comparison.
    signal input entryValueHashes[MAX_ENTRIES];

    // (In)equality constraint: prove this entry's value has (not) the
    // same hash as another entry.
    //
    // This can be disabled by checking for equality with self:
    // entryEqualToOtherEntryIndex[i] = i; isEqualToOtherEntry = 1.
    //
    // `isEqualToOtherEntry` is assumed to be constrained to be 0 or 1
    // elsewhere.
    signal input equalToOtherEntryByIndex;
    signal input isEqualToOtherEntry;

    signal otherValueHash <== InputSelector(MAX_ENTRIES)(entryValueHashes, equalToOtherEntryByIndex);

    signal equalityCheck <== IsEqual()([valueHash, otherValueHash]);

    equalityCheck === isEqualToOtherEntry;
}
