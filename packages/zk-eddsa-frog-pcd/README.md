# `@pcd/zk-eddsa-frog-pcd`

A PCD representing a proof of ownership of an EdDSA-signed frog. The prover
is able to prove ownership of a frog corresponding to their semaphore
identity. The prover can keep their identity private, and selectively
reveal some or none of the individual frog fields. To harden against
various abuses, the proof can be watermarked, and can include a nullifier.
