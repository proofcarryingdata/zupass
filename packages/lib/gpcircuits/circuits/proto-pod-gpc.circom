pragma circom 2.1.8;

include "circomlib/circuits/gates.circom";
include "circomlib/circuits/poseidon.circom";
include "entry.circom";
include "entry-inequality.circom";
include "global.circom";
include "gpc-util.circom";
include "list-membership.circom";
include "multituple.circom";
include "numeric-value.circom";
include "object.circom";
include "ownerV3.circom";
include "ownerV4.circom";
include "uniqueness.circom";
include "virtual-entry.circom";

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

    // Max number of numeric values.
    MAX_NUMERIC_VALUES,

    // Max number of entry inequalities.
    MAX_ENTRY_INEQUALITIES,
    
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
    TUPLE_ARITY,

    // Indicates whether the Semaphore V3 owner module should be
    // enabled.  Should be 0 or 1.
    INCLUDE_OWNERV3,

    // Indicates whether the Semaphore V4 owner module should be
    // enabled.  Should be 0 or 1.
    INCLUDE_OWNERV4
) {
    /**
     * Maximum number of bits in a POD int value. Used in the bounds
     * check, numeric value and entry inequality modules.
     */
    var POD_INT_BITS = 64;
     
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

    /*
     * 1+ EntryModule.
     * Each array corresponds to one input/output for each entry module.  Non-array inputs
     * are packed bits, which will be split between modules within the circuit.
     */

    // Object index containing each entry.
    signal input entryObjectIndex[MAX_ENTRIES];

    // Entry name (by hash) and value.  Value's hash is implicitly included as 1st sibling.
    signal input entryNameHash[MAX_ENTRIES];
    
    // Boolean flags for entry value behavior.
    signal input entryIsValueHashRevealed /*MAX_ENTRIES packed bits*/;
    signal entryIsValueHashRevealedBits[MAX_ENTRIES] <== Num2Bits(MAX_ENTRIES)(entryIsValueHashRevealed);

    // Merkle proof of entry name's membership in the object's Merkle tree.
    signal input entryProofDepth[MAX_ENTRIES], entryProofIndex[MAX_ENTRIES] /*MERKLE_MAX_DEPTH packed bits*/ , entryProofSiblings[MAX_ENTRIES][MERKLE_MAX_DEPTH];

    // Entry value is optionally revealed by hash, or set to -1 if not.
    signal output entryRevealedValueHash[MAX_ENTRIES];

    // Convenience value: entry value hashes are present as first sibling of each entry proof.
    signal entryValueHashes[MAX_ENTRIES];
    for (var i = 0; i < MAX_ENTRIES; i++) {
        entryValueHashes[i] <== entryProofSiblings[i][0];
    }

    /*
     * 1 VirtualEntryModule.
     * Virtual entries are derived from PODs' cryptographic data,
     * e.g. the signers' public keys.
     *
     * This block pipes them in and forms signals to be fed into the
     * entry constraint, tuple and list membership modules below, as well
     * as those revealing their hashes where applicable.
     */
    
    // Maximum number of virtual entries.
    var MAX_VIRTUAL_ENTRIES = 2 * MAX_OBJECTS;

    // Total number of entries in the circuit, virtual or otherwise
    var TOTAL_ENTRIES = MAX_ENTRIES + MAX_VIRTUAL_ENTRIES;

    // Boolean flags for virtual entry behaviour.
    signal input virtualEntryIsValueHashRevealed /*MAX_VIRTUAL_ENTRIES packed bits*/;

    // Virtual entry value hashes to be computed by virtual entry module
    signal virtualEntryValueHashes[MAX_VIRTUAL_ENTRIES];

    // Virtual entry value is optionally revealed by hash, or set to -1 if not.
    signal output virtualEntryRevealedValueHash[MAX_VIRTUAL_ENTRIES];

    (virtualEntryValueHashes, virtualEntryRevealedValueHash)
        <== VirtualEntryModule(MAX_OBJECTS)(
            virtualEntryIsValueHashRevealed,
            objectContentID,
            objectSignerPubkeyAx,
            objectSignerPubkeyAy);

    // Append virtual entry hashes to entry hashes for use in the
    // entry constraint module.
    signal totalEntryValueHashes[TOTAL_ENTRIES]
        <== Append(MAX_ENTRIES, MAX_VIRTUAL_ENTRIES)(
            entryValueHashes,
            virtualEntryValueHashes);

    /*
     * 1 EntryConstraintModule for each entry, virtual or otherwise.
     */
    
    // Entry or virtual entry can be compared for equality (by hash)
    // to another entry or virtual entry (by index). An index less
    // than MAX_ENTRIES refers to an entry and an index i in
    // [MAX_ENTRIES, MAX_ENTRIES + MAX_VIRTUAL_ENTRIES[ refers to the
    // (i - MAX_ENTRIES)th virtual entry.
    // This can be disabled by comparing to self:
    //   entryEqualToOtherEntryIndex[i] = i
    signal input entryEqualToOtherEntryByIndex[TOTAL_ENTRIES];

    // Boolean flag for whether the comparison should be equality or
    // inequality.
    signal input entryIsEqualToOtherEntry /*TOTAL_ENTRIES packed bits*/;
    signal entryIsEqualToOtherEntryBits[TOTAL_ENTRIES] <== Num2Bits(TOTAL_ENTRIES)(entryIsEqualToOtherEntry);

    // Modules which scale with number of (non-virtual) entries.
    for (var entryIndex = 0; entryIndex < MAX_ENTRIES; entryIndex++) {
        // Entry module proves that an entry exists within the object's merkle tree.
        entryRevealedValueHash[entryIndex] <== EntryModule(MERKLE_MAX_DEPTH)(
            objectContentID <== InputSelector(MAX_OBJECTS)(objectContentID, entryObjectIndex[entryIndex]),
            nameHash <== entryNameHash[entryIndex],
            isValueHashRevealed <== entryIsValueHashRevealedBits[entryIndex],
            proofDepth <== entryProofDepth[entryIndex],
            proofIndex <== entryProofIndex[entryIndex],
            proofSiblings <== entryProofSiblings[entryIndex]
        );
    }

    // Items which scale with the number of total entries (real and virtual).
    for (var entryIndex = 0; entryIndex < TOTAL_ENTRIES; entryIndex++) {
        // EntryConstraint module contains constraints applied to each individual entry.
        EntryConstraintModule(TOTAL_ENTRIES)(
            valueHash <== totalEntryValueHashes[entryIndex],
            entryValueHashes <== totalEntryValueHashes,
            equalToOtherEntryByIndex <== entryEqualToOtherEntryByIndex[entryIndex],
            isEqualToOtherEntry <== entryIsEqualToOtherEntryBits[entryIndex]
        );
    }

    /*
     * External nullifier for owner modules (if any).
     *
     * The final nullifier hash(es) will be calculated based on this
     * and the owner's identity.
     */
    signal input ownerExternalNullifier;
    
    /*
     * <=1 OwnerModuleV3 with its inputs & outputs.
     */

    // Entry containing owner's Semaphore V3 commitment (public), or -1 to disable ownership checking.
    signal input ownerV3EntryIndex[INCLUDE_OWNERV3];

    // Owner's Semaphore V3 identity (private key) kept hidden and verified.
    signal input ownerSemaphoreV3IdentityNullifier[INCLUDE_OWNERV3], ownerSemaphoreV3IdentityTrapdoor[INCLUDE_OWNERV3];

    // Indicator of whether the nullifier hash should be revealed.
    signal input ownerV3IsNullifierHashRevealed[INCLUDE_OWNERV3];

    // Owner module verifies owner's ID, and generates nullifier.
    signal output ownerV3RevealedNullifierHash[INCLUDE_OWNERV3];
    signal ownerV3IsEnabled[INCLUDE_OWNERV3];
        
    for (var i = 0; i < INCLUDE_OWNERV3; i++) {
        ownerV3IsEnabled[i] <== NOT()(IsZero()(ownerV3EntryIndex[i] + 1));
        ownerV3RevealedNullifierHash[i] <== OwnerModuleSemaphoreV3()(
            enabled <== ownerV3IsEnabled[i],
            identityNullifier <== ownerSemaphoreV3IdentityNullifier[i],
            identityTrapdoor <== ownerSemaphoreV3IdentityTrapdoor[i],
            identityCommitmentHash <== InputSelector(MAX_ENTRIES)(entryValueHashes, ownerV3IsEnabled[i] * ownerV3EntryIndex[i]),
            externalNullifier <== ownerExternalNullifier,
            isNullifierHashRevealed <== ownerV3IsNullifierHashRevealed[i]
        );
    }
    /*
     * <=1 OwnerModuleV4 with its inputs & outputs.
     */

    // Entry containing owner's Semaphore V4 commitment (public), or -1 to disable ownership checking.
    signal input ownerV4EntryIndex[INCLUDE_OWNERV4];
        
    // Owner's Semaphore V4 secret scalar (derived from private key)
    // kept hidden and verified.
    signal input ownerSemaphoreV4SecretScalar[INCLUDE_OWNERV4];

    // Indicator of whether the nullifier hash should be revealed.
    signal input ownerV4IsNullifierHashRevealed[INCLUDE_OWNERV4];
        
    // Owner module verifies owner's ID, and generates nullifier.
    signal output ownerV4RevealedNullifierHash[INCLUDE_OWNERV4];
    signal ownerV4IsEnabled[INCLUDE_OWNERV4];

    for (var i = 0; i < INCLUDE_OWNERV4; i++) {
        ownerV4IsEnabled[i] <== NOT()(IsZero()(ownerV4EntryIndex[i] + 1));
        ownerV4RevealedNullifierHash[i] <== OwnerModuleSemaphoreV4()(
            enabled <== ownerV4IsEnabled[i],
            secretScalar <== ownerSemaphoreV4SecretScalar[i],
            identityCommitment <== InputSelector(MAX_ENTRIES)(
                entryValueHashes,
                ownerV4IsEnabled[i] * ownerV4EntryIndex[i]
            ),
            externalNullifier <== ownerExternalNullifier,
            isNullifierHashRevealed <== ownerV4IsNullifierHashRevealed[i]
        );
    }
    
    /*
     * (MAX_NUMERIC_VALUES) NumericValueModules with their inputs
     */

    // Array of numeric values as well as an array of indices of
    // entries to which they correspond. These will be checked for
    // consistency in the numeric value module. These should be
    // padded with 0s and -1s respectively if necessary.
    signal input numericValues[MAX_NUMERIC_VALUES];
    signal input numericValueEntryIndices[MAX_NUMERIC_VALUES];

    // Bit-packed indicators of whether the corresponding numeric
    // values should lie within the corresponding bounds.
    signal input numericValueInRange;
    signal numericValueInRangeBits[MAX_NUMERIC_VALUES]
        <== Num2Bits(MAX_NUMERIC_VALUES)(numericValueInRange);
    
    // Arrays of (inclusive) 64-bit signed integer bounds, where the
    // ith element of each array specifies the minimum or maximum
    // value that the ith value being checked can take. Note that
    // these bounds are not constrained here; since they are public
    // inputs, they should be checked externally. These arrays should
    // be padded with 0s if necessary.
    signal input numericMinValues[MAX_NUMERIC_VALUES];
    signal input numericMaxValues[MAX_NUMERIC_VALUES];

    // Output of numeric value module (bounds check).
    signal numericValueBoundsCheck[MAX_NUMERIC_VALUES];
    
    for (var i = 0; i < MAX_NUMERIC_VALUES; i++) {
        numericValueBoundsCheck[i]
            <== NumericValueModule(POD_INT_BITS)(
                // Disable value hash check if index is -1.
                NOT()(
                    IsZero()(numericValueEntryIndices[i] + 1)
                      ),
                numericValues[i],
                MaybeInputSelector(MAX_ENTRIES)(
                    entryValueHashes,
                    numericValueEntryIndices[i]
                                                ),
                numericMinValues[i],
                numericMaxValues[i]);

        numericValueInRangeBits[i] === numericValueBoundsCheck[i];
    }

    /*
     * (MAX_ENTRY_INEQUALITIES) EntryInequalityModules with their
     * inputs & outputs.
     */
    
    // Values to be compared are referenced by their indices in
    // `numericValues`. These should be padded with 0s if necessary.
    signal input entryInequalityValueIndex[MAX_ENTRY_INEQUALITIES];
    signal input entryInequalityOtherValueIndex[MAX_ENTRY_INEQUALITIES];

    // Inequalities are of the form 'value < otherValue' or 'value >=
    // otherValue', the former corresponding to entry inequality
    // module output value 1 and the latter to 0. This motivates the
    // following bit-packed indicators. These should be padded with
    // 0s if necessary.
    signal input entryInequalityIsLessThan;
    signal entryInequalityIsLessThanBits[MAX_ENTRY_INEQUALITIES]
        <== Num2Bits(MAX_ENTRY_INEQUALITIES)(entryInequalityIsLessThan);

    // Output of entry inequality check.
    signal entryInequalityCheck[MAX_ENTRY_INEQUALITIES];
    
    for (var i = 0; i < MAX_ENTRY_INEQUALITIES; i++) {
        entryInequalityCheck[i]
            <== EntryInequalityModule(POD_INT_BITS)(
                InputSelector(MAX_NUMERIC_VALUES)(
                    numericValues,
                    entryInequalityValueIndex[i]
                ),
                InputSelector(MAX_NUMERIC_VALUES)(
                    numericValues,
                    entryInequalityOtherValueIndex[i]
                )
            );
        entryInequalityIsLessThanBits[i] === entryInequalityCheck[i];
    }
    
    /*
     * 1 MultiTupleModule with its inputs & outputs.
     */

    // Array of indices of elements forming the desired tuples (cf. MultiTupleModule).
    signal input tupleIndices[MAX_TUPLES][TUPLE_ARITY];

    // Hashes representing these tuples.
    signal tupleHashes[MAX_TUPLES] <== MultiTupleModule(MAX_TUPLES, TUPLE_ARITY, TOTAL_ENTRIES)(
        totalEntryValueHashes,
        tupleIndices);
    
    /*
     * (MAX_LISTS) ListMembershipModules with their inputs & outputs.
     */

    // Index of entry value (if less than `MAX_ENTRIES`) or tuple hash that ought to be a member
    // of the ith list.
    // This is equal to -1 wherever a list membership check is not required, which has the effect of
    // checking that the value 0 is a member of the list of valid values, which should also be set
    // to a list of zeroes to match.
    signal input listComparisonValueIndex[MAX_LISTS];

    // Bit-packed indicators of whether the comparison values should
    // be members of the list.
    // An entry of the unpacked bit array is equal to 1 if the corresponding
    // index in the comparison value array should be a member of the list and
    // 0 if it shouldn't.
    signal input listContainsComparisonValue /*MAX_LISTS packed bits*/;
    signal listContainsComparisonValueBits[MAX_LISTS] <== Num2Bits(MAX_LISTS)(listContainsComparisonValue);
    
    // List of accepted values for membership checks. Depending on the indices above, these need to
    // match element value hashes, tuple hashes, or a constant value of 0 for disabled checks.
    signal input listValidValues[MAX_LISTS][MAX_LIST_ELEMENTS];

    // Result of list membership check.
    signal membershipCheckResult[MAX_LISTS];

    for (var i = 0; i < MAX_LISTS; i++) {
        membershipCheckResult[i] <== ListMembershipModule(MAX_LIST_ELEMENTS)(
            MaybeInputSelector(TOTAL_ENTRIES + MAX_TUPLES)(
                Append(TOTAL_ENTRIES, MAX_TUPLES)(totalEntryValueHashes, tupleHashes),
                listComparisonValueIndex[i]),
            listValidValues[i]);

        listContainsComparisonValueBits[i] === membershipCheckResult[i];
    }

    /*
     * 1 UniquenessModule with its inputs & outputs.  Currently only
     * used for uniqueness of PODs via their content IDs.
     */

    // Boolean indicating whether the uniqueness module is enabled.
    signal input requireUniqueContentIDs;
    signal podsAreUnique <== UniquenessModule(MAX_OBJECTS)(
        objectContentID
    );
    requireUniqueContentIDs * (1 - podsAreUnique) === 0;
    
    /*
     * 1 GlobalModule with its inputs & outputs.
     */

    // Watermark is an arbitrary value used to uniquely identify a proof.
    signal input globalWatermark;

    // Catch-all for logic global to the circuit, not tied to any of the other modules above.
    GlobalModule()(globalWatermark);
}
