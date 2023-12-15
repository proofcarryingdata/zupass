# `@pcd/webauthn-pcd`

A wrapper around WebAuthn authentication verification as specified by the [W3C protocol](https://www.w3.org/TR/webauthn-2/#sctn-verifying-assertion). WebAuthn enables authentication via a keypair rather than a password, including Face ID, Yubico devices, and many other devices. More options can be configured, such as allowed origin, a unique client ID, and a challenge to be signed.

In contrast to purely software-based PCDs, the WebAuthn PCD allows for actions in the physical world to form the basis of a proof. The specific _authorization gesture_ used for registration and authentication can be associated with a hardware device and includes actions like facial recognition, PINs, and fingerprints. With a TPM or secure enclave, the authenticator can have certain security guarantees, such as the private key not being knowable even by the owner of the device.

Some example use cases:

- Proof that I own a particular Yubikey and therefore am a authorized member of an organization.
- Proof that I own an Apple device that has a particular [Passkey](https://developer.apple.com/passkeys/), and that I've used Face ID or Touch ID to authenticate.
- Proof that a human has in some way interacted with a hardware device (through fingerprint, facial scan, or other [test of user presence](https://www.w3.org/TR/webauthn-2/#test-of-user-presence)), and therefore not an script or automated spammer.
