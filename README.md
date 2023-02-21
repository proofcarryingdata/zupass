# ZK Faucet

ZK Faucet is a webapp that drips Goerli ETH to users who provide a valid zero knowledge proof that attests to their ownership of an online identity that is a contributor to open-source Ethereum development on GitHub. You can think of it as an airdrop for using a DeFi protocol, except the protocol is "open source".

## ZK Proof Construction

1. GitHub conveniently makes available the SSH public keys of all of its users. Our backend periodically downloads the public keys of users who have made at least one commit to at least one project we consider a member project of the Ethereum open source community.

2. We construct a merkle tree out of these public keys. It is used for a group membership inclusion check inside of the ZK proof. We also make this merkle tree available for download by users via our webapp.

3. The ZK Proof simply proves that its creator has signed a message with a private key that corresponds to a public key which exists in the merkle tree constructed in the previous step. The public signals of this proof are only:
   - merkle tree root
   - a nullifier, which is a hash of the signature

## End-to-End Implementation

A user who wishes to receive Goerli ETH can download a package that is part of the ZK Faucet project called `@0xparc/zk-ssh`. We provide a bash one-liner that makes use of this package that the user can execute to:

- download the merkle tree from step 2
- download the zkey and other circom proving artifacts
- sign a message with an SSH key that they use for GitHub
- create a merkle proof given the SSH public key and merkle root
- generate a proof using this signature, the merkle tree root and proof, and the public key

The user can then upload this ZK proof via our front-end. The proof's nullifier is recorded, we check that a proof with that nullifier has not been used in the last day. This prevents users from draining our faucet, while also preserving their anonymity, as the nullifier is not able to be reversed into the original SSH key.

## Questions

- Which projects/orgs should be eligible?
- How are we going to get Goerli ETH?
- What is the best way to split out the circom components of this project into packages? I have encountered many limitations.
- How can we be sure that `@0xparc/zk-ssh` is trusted? After all, it's arbitrary code that we're asking our users to download and execute.
