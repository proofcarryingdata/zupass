# `@pcd/zk-eddsa-ticket-pcd`

A PCD representing a proof of ownership of an EdDSA-signed ticket. The prover
is able to prove ownership of a ticket corresponding to their semaphore
identity, while keeping their identity private, and selectively revealing some
or none of the individual ticket fields. To harden against various abuses,
the proof can be watermarked, and can include a nullifier.

Note: this PCD is deprecated, and can be replaced with the more flexible
zk-eddsa-event-ticket-pcd.
