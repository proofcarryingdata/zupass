# `@pcd/halo-nonce-pcd`

A PCD wrapper for one operation of the HaLo (Hardware Locked) tags from Arx Research, [`sign_random`](https://github.com/arx-research/libhalo/blob/master/docs/halo-command-set.md#command-sign_random). This is an operation in which the private key in slot #2 of the HaLo tag produces an secp256k1 ECDSA signature of an **incrementing nonce** concatenated with a random string. The nonce is incremented by the HaLo tag after each signature operation. These tags can be used to produce in-person PCDs for mementos or baton experiences.
