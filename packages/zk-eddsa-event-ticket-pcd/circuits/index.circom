pragma circom 2.1.4;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

// Helper template for revealed fields. out will be set to value or to -1 if
// not revealed.
// The shouldRevealValue input is assumed (but not constrained) to be 0 or 1.
// Should be constrained externally.
template ValueOrNegativeOne() {
    signal input value;
    signal input shouldRevealValue; // assumed to be 0 or 1

    signal output out;

    out <== value * shouldRevealValue + (-1) * (1 - shouldRevealValue);
}

// Claim being proved: Attendee (by Semaphore ID) has ticket to event (indicated
// by ticket's event ID) signed by signer (EdDSA pubkey). The ticket's event
// ID is optionally constrained to be in a list of events (array of valid event
// IDs of size nEvents).
// Additionally a nullifier is calculated, and a watermark is included
// (unmodified).
// Configuration options can determine which of the ticket and nullifier fields
// are revealed publicly.
// Configuration can enable or disable the event ID list checking, for cases
// where any event ID is acceptable. The full validEventIds list is checked,
// but it can be filled in with illegal values (such as -1) to represent a
// shorter list. (This assumes the ticket signer won't sign an event ID of -1.)
template EdDSATicketToEventsPCD (nEvents) {
    // Fields representing attendee's ticket, each of which can be configurably
    // revealed or not in the proof.
    // TODO: Consider a more extensible representation, such an array with known
    // offsets and room for growth.
    signal input ticketId;
    signal input revealTicketId;

    signal input ticketEventId;
    signal input revealTicketEventId;

    signal input ticketProductId;
    signal input revealTicketProductId;

    signal input ticketTimestampConsumed;
    signal input revealTicketTimestampConsumed;

    signal input ticketTimestampSigned;
    signal input revealTicketTimestampSigned;

    signal input ticketAttendeeSemaphoreId;
    signal input revealTicketAttendeeSemaphoreId;

    signal input ticketIsConsumed;
    signal input revealTicketIsConsumed;

    signal input ticketIsRevoked;
    signal input revealTicketIsRevoked;

    signal input ticketCategory;
    signal input revealTicketCategory;

    signal input reservedSignedField1;
    signal input revealReservedSignedField1;

    signal input reservedSignedField2;
    signal input revealReservedSignedField2;

    signal input reservedSignedField3;
    signal input revealReservedSignedField3;

    // Signer of ticket: EdDSA public key
    signal input ticketSignerPubkeyAx;
    signal input ticketSignerPubkeyAy;

    // Signature of ticket: EdDSA signaure
    signal input ticketSignatureR8x;
    signal input ticketSignatureR8y;
    signal input ticketSignatureS;

    // Attendee's Semaphore identity (private key)
    signal input semaphoreIdentityNullifier;
    signal input semaphoreIdentityTrapdoor;

    // The ticket correspond to one of these valid events.
    // Ignored if checkValidEventIds is 0.
    // TODO: Consider replacing with a Merkle proof?
    signal input validEventIds[nEvents];
    signal input checkValidEventIds;

    // External nullifier, used to tie together nullifiers within a single category. 
    signal input externalNullifier;

    // Whether to reveal the nullifier hash, which can be used to tie together
    // different proofs from the same semaphore ID.
    signal input revealNullifierHash;

    // Watermark allows prover to tie a proof to a challenge.  It's
    // unconstrained, but included in the proof.
    signal input watermark;

    // Verify all revealX values are 1 or 0
    revealTicketId * (1 - revealTicketId) === 0;
    revealTicketEventId * (1 - revealTicketEventId) === 0;
    revealTicketProductId * (1 - revealTicketProductId) === 0;
    revealTicketTimestampConsumed * (1 - revealTicketTimestampConsumed) === 0;
    revealTicketTimestampSigned * (1 - revealTicketTimestampSigned) === 0;
    revealTicketAttendeeSemaphoreId * (1 - revealTicketAttendeeSemaphoreId) === 0;
    revealTicketIsConsumed * (1 - revealTicketIsConsumed) === 0;
    revealTicketIsRevoked * (1 - revealTicketIsRevoked) === 0;
    revealNullifierHash * (1 - revealNullifierHash) === 0;
    revealTicketCategory * (1 - revealTicketCategory) === 0;
    revealReservedSignedField1 * (1 - revealReservedSignedField1) === 0;
    revealReservedSignedField2 * (1 - revealReservedSignedField2) === 0;
    revealReservedSignedField3 * (1 - revealReservedSignedField3) === 0;

    // Calculate "message" representing the ticket, which is a hash of the fields.
    signal ticketMessageHash <== Poseidon(12)([
        ticketId,
        ticketEventId,
        ticketProductId,
        ticketTimestampConsumed,
        ticketTimestampSigned,
        ticketAttendeeSemaphoreId,
        ticketIsConsumed,
        ticketIsRevoked,
        ticketCategory,
        reservedSignedField1,
        reservedSignedField2,
        reservedSignedField3
    ]);

    // Verify ticket signature
    EdDSAPoseidonVerifier()(
        1,
        ticketSignerPubkeyAx,
        ticketSignerPubkeyAy,
        ticketSignatureS,
        ticketSignatureR8x,
        ticketSignatureR8y,
        ticketMessageHash
    );

    // Verify semaphore private identity matches the ID in the ticket by
    // re-generating the public ID to compare.
    signal semaSecret <== Poseidon(2)([
        semaphoreIdentityNullifier,
        semaphoreIdentityTrapdoor
    ]);
    signal semaIDCommitment <== Poseidon(1)([semaSecret]);
    ticketAttendeeSemaphoreId === semaIDCommitment;

    // checkValidEventIds config must be a boolean (0 or 1).
    checkValidEventIds * (1 - checkValidEventIds) === 0;

    // Check that the event ID (from the ticket) is one of the valid event IDs.
    // This is a logical OR expressed in the fact that (ID - validID[i]) should
    // be zero for some i, so the product of all terms should be zero.
    signal oneofPartialProducts[nEvents+1];
    oneofPartialProducts[0] <== 1;
    for (var i = 0; i < nEvents; i++) {
        oneofPartialProducts[i+1] <== oneofPartialProducts[i] * (ticketEventId - validEventIds[i]);
    }
    oneofPartialProducts[nEvents] * checkValidEventIds === 0;

    // Calculate nullifier
    signal nullifierHash <== Poseidon(2)([externalNullifier, semaphoreIdentityNullifier]);

    // Dummy constraint on watermark to make sure it can't be compiled out.
    signal watermarkSquared <== watermark * watermark;

    // Revealed ticket fields get either the value or -1 based on configuration.
    signal output revealedTicketId <== ValueOrNegativeOne()(ticketId, revealTicketId);
    signal output revealedEventId <== ValueOrNegativeOne()(ticketEventId, revealTicketEventId);
    signal output revealedProductId <== ValueOrNegativeOne()(ticketProductId, revealTicketProductId);
    signal output revealedTimestampConsumed <== ValueOrNegativeOne()(ticketTimestampConsumed, revealTicketTimestampConsumed);
    signal output revealedTimestampSigned <== ValueOrNegativeOne()(ticketTimestampSigned, revealTicketTimestampSigned);
    signal output revealedAttendeeSemaphoreId <== ValueOrNegativeOne()(ticketAttendeeSemaphoreId, revealTicketAttendeeSemaphoreId);
    signal output revealedIsConsumed <== ValueOrNegativeOne()(ticketIsConsumed, revealTicketIsConsumed);
    signal output revealedIsRevoked <== ValueOrNegativeOne()(ticketIsRevoked, revealTicketIsRevoked);
    signal output revealedTicketCategory <== ValueOrNegativeOne()(ticketCategory, revealTicketCategory);
    signal output revealedReservedSignedInput1 <== ValueOrNegativeOne()(reservedSignedField1, revealReservedSignedField1);
    signal output revealedReservedSignedInput2 <== ValueOrNegativeOne()(reservedSignedField2, revealReservedSignedField2);
    signal output revealedReservedSignedInput3 <== ValueOrNegativeOne()(reservedSignedField3, revealReservedSignedField3);

    // Revealed nullifier gets either the value or -1 based on configuration.
    signal output revealedNullifierHash <== ValueOrNegativeOne()(nullifierHash, revealNullifierHash);
}

component main { public [ ticketSignerPubkeyAx, ticketSignerPubkeyAy, validEventIds, checkValidEventIds, externalNullifier, watermark ] } = EdDSATicketToEventsPCD(20);
