use dep::frogcrypto::{assert_frog_ownership, Frog};
use dep::semaphore::{calculate_nullifier_hash, SemaphoreIdentity};

fn main(
    frog: Frog,
    frog_signer_pubkey_A_x: pub Field,
    frog_signer_pubkey_A_y: pub Field,
    frog_signature_s: Field,
    frog_signature_r8_x: Field,
    frog_signature_r8_y: Field,
    semaphore_identity: SemaphoreIdentity,
    external_nullifier: pub Field,
    // squaring trick will be compiled out from dead code analysis.
    // Instead we just return the watermark from the circuit.
    watermark: Field
)-> pub (Field, Field, Frog) {
    assert_frog_ownership(
        frog,
        frog_signer_pubkey_A_x,
        frog_signer_pubkey_A_y,
        frog_signature_s,
        frog_signature_r8_x,
        frog_signature_r8_y,
        semaphore_identity
    );

    let nullifier_hash = calculate_nullifier_hash(external_nullifier, semaphore_identity.nullifier);

    let revealed_frog = Frog {
        id: frog.id,
        biome: frog.biome,
        rarity: frog.rarity,
        temperament: frog.temperament,
        jump: frog.jump,
        speed: frog.speed,
        intelligence: frog.intelligence,
        beauty: frog.beauty,
        timestamp_signed: frog.timestamp_signed,
        owner_semaphore_id: frog.owner_semaphore_id,
        reserved_field1: 0,
        reserved_field2: 0,
        reserved_field3: 0,
    };
    (nullifier_hash, watermark, revealed_frog)
}
