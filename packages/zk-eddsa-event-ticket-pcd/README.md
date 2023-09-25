# `@pcd/zk-eddsa-event-ticket-pcd`

A PCD representing a proof of ownership of an EdDSA-signed ticket. The prover
is able to prove ownership of a ticket corresponding to their semaphore
identity, and optionally prove the ticket corresponds to one of a list
of valid events. The prover can keep their identity private, and selectively
reveal some or none of the individual ticket fields. To harden against
various abuses, the proof can be watermarked, and can include a nullifier.

Note: this PCD subsumes all functionality of zk-eddsa-ticket-pcd and can
replace it over time.
