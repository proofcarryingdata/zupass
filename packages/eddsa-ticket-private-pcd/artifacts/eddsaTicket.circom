pragma circom 2.1.4;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

template ValueOrNegativeOne() {
    signal input value;
    signal input shouldRevealValue; // assumed to be 0 or 1

    signal output out;

    out <== value * shouldRevealValue + (-1) * (1 - shouldRevealValue);
}

template PartialTicket () {
    // signed ticket fields
    signal input ticketId;
    signal input revealTicketId;

    signal input eventId;
    signal input revealEventId;

    signal input productId;
    signal input revealProductId;

    signal input timestampConsumed;
    signal input revealTimestampConsumed;

    signal input timestampSigned;
    signal input revealTimestampSigned;

    signal input attendeeSemaphoreId;
    signal input revealAttendeeSemaphoreId;

    signal input isConsumed;
    signal input revealIsConsumed;

    signal input isRevoked;
    signal input revealIsRevoked;

    // external nullifier
    signal input externalNullifier;

    // whether to reveal the nullifier hash or not
    signal input revealNullifierHash;
    
    // public key of signer
    signal input Ax;
    signal input Ay;

    // signature
    signal input R8x;
    signal input R8y;
    signal input S;

    // semaphore "private key"
    signal input identityNullifier;
    signal input identityTrapdoor;

    // prover can watermark proof to a challenge
    signal input watermark;
    signal watermarkSq <== watermark * watermark;

    // make sure all revealX values are 1 or 0
    revealTicketId * (1 - revealTicketId) === 0;
    revealEventId * (1 - revealEventId) === 0;
    revealProductId * (1 - revealProductId) === 0;
    revealTimestampConsumed * (1 - revealTimestampConsumed) === 0;
    revealTimestampSigned * (1 - revealTimestampSigned) === 0;
    revealAttendeeSemaphoreId * (1 - revealAttendeeSemaphoreId) === 0;
    revealIsConsumed * (1 - revealIsConsumed) === 0;
    revealIsRevoked * (1 - revealIsRevoked) === 0;
    revealNullifierHash * (1 - revealNullifierHash) === 0;

    // calculate message
    component messageHasher = Poseidon(8);
    messageHasher.inputs[0] <== ticketId;
    messageHasher.inputs[1] <== eventId;
    messageHasher.inputs[2] <== productId;
    messageHasher.inputs[3] <== timestampConsumed;
    messageHasher.inputs[4] <== timestampSigned;
    messageHasher.inputs[5] <== attendeeSemaphoreId;
    messageHasher.inputs[6] <== isConsumed;
    messageHasher.inputs[7] <== isRevoked;

    // verify signature
    component sigVerifier = EdDSAPoseidonVerifier();
    sigVerifier.enabled <== 1;
    sigVerifier.Ax <== Ax;
    sigVerifier.Ay <== Ay;
    sigVerifier.S <== S;
    sigVerifier.R8x <== R8x;
    sigVerifier.R8y <== R8y;
    sigVerifier.M <== messageHasher.out;

    // verify knowledge of semaphore ID
    component semaSecretHasher = Poseidon(2);
    semaSecretHasher.inputs[0] <== identityNullifier;
    semaSecretHasher.inputs[1] <== identityTrapdoor;
    signal semaSecret <== semaSecretHasher.out;
    component semaIDHasher = Poseidon(1);
    semaIDHasher.inputs[0] <== semaSecret;
    signal semaIDCommitment <== semaIDHasher.out;
    attendeeSemaphoreId === semaIDCommitment;

    // calculate nullifier
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== externalNullifier;
    nullifierHasher.inputs[1] <== identityNullifier;
    signal nullifierHash <== nullifierHasher.out;

    // calculate revealed ticket fields
    signal output revealedTicketId <== ValueOrNegativeOne()(ticketId, revealTicketId);
    signal output revealedEventId <== ValueOrNegativeOne()(eventId, revealEventId);
    signal output revealedProductId <== ValueOrNegativeOne()(productId, revealProductId);
    signal output revealedTimestampConsumed <== ValueOrNegativeOne()(timestampConsumed, revealTimestampConsumed);
    signal output revealedTimestampSigned <== ValueOrNegativeOne()(timestampSigned, revealTimestampSigned);
    signal output revealedAttendeeSemaphoreId <== ValueOrNegativeOne()(attendeeSemaphoreId, revealAttendeeSemaphoreId);
    signal output revealedIsConsumed <== ValueOrNegativeOne()(isConsumed, revealIsConsumed);
    signal output revealedIsRevoked <== ValueOrNegativeOne()(isRevoked, revealIsRevoked);

    // calculate revealed nullifier
    signal output revealedNullifierHash <== ValueOrNegativeOne()(nullifierHash, revealNullifierHash);
}

component main { public [ Ax, Ay ] } = PartialTicket();