<p align="center">
    <h1 align="center">
        @pcd/gpc
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/gpc/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/gpc">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/pod-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/gpc">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/gpc.svg?style=flat-square" />
    </a>
<br>
    <a href="https://pod.org/gpc/introduction">
        <img alt="Developer Site" src="https://img.shields.io/badge/Developer_Site-green.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/gpcExample.ts#L88">
        <img alt="Tutorial Code" src="https://img.shields.io/badge/Tutorial_Code-blue.svg?style=flat-square">
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_gpc.html">
        <img alt="TypeDoc" src="https://img.shields.io/badge/TypeDoc-purple.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc">
        <img alt="GitHub" src="https://img.shields.io/badge/GitHub-grey.svg?style=flat-square">
    </a>
</p>

A library for creating and verifying zero-knowledge proofs using General Purpose
Circuits. For a full introduction, see the
[Developer Site](https://pod.org/gpc/introduction).

**POD** libraries enable any app to create zero-knowledge proofs of cryptographic data. A POD could represent your ticket to an event, a secure
message, a collectible badge, or an item in a role-playing game. Using PODs,
developers can create ZK-enabled apps without the effort and risk of developing
custom cryptography.

ZK proofs about PODs use General Purpose Circuits (**GPC**) which can prove many
different things about PODs without revealing all details. GPCs use
human-readable configuration and pre-compiled circuits so no knowledge of
circuit programming is required.

PODs and GPCs can be used in Zupass, or in your own apps without Zupass.

## What is a GPC?

GPCs allow ZK proofs to be created from a simple proof configuration. You can
configure your proofs using a human-readable JSON format (or equivalent
TypeScript code), which is used to generate the specific circuit inputs needed
for the proof.

```TypeScript
const weaponProofConfig: GPCProofConfig = {
  pods: {
    weapon: {
      entries: {
        attack: { isRevealed: true },
        weaponType: { isRevealed: false, isMemberOf: "favoriteWeapons" },
        owner: { isRevealed: false, isOwnerID: true }
      }
    }
  }
};
```

The GPC library inclues a family of pre-compiled ZK circuits with different
sizes and capabilities. It will automatically select the right circuit to
satisfy the needs of each proof at run-time. No setup is required, and you
don’t need any knowledge of circuit programming (circom, halo2, noir, etc).

GPCs can prove properties of one POD or several PODs together. PODs can be
proven to be owned by the prover, using their Semaphore identity. A GPC can
constrain as many named entries as needed, whether revealed or not. For example,
a proof might constraint two entries to be equal, constrain a third entry to be
in a list of valid values, and reveal the value of a fourth entry.

## Entry Points

- The [`GPCProofConfig`](https://docs.pcd.team/types/_pcd_gpc.GPCProofConfig.html)
  type configures a proof. Start there to learn what you can prove about PODs.
- The [`gpcProve`](https://docs.pcd.team/functions/_pcd_gpc.gpcProve.html) and
  [`gpcVerify`](https://docs.pcd.team/functions/_pcd_gpc.gpcVerify.html)
  functions allow you to generate and validate GPC proofs.
- The [`gpcArtifactDownloadURL`](https://docs.pcd.team/functions/_pcd_gpc.gpcArtifactDownloadURL.html)
  function can help you find the right place to get the necessary binary
  artifacts (proving key, verification key, witness generator) to perform
  proof calculations.

For more details on usage, check out the
[tutorial code](https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/gpcExample.ts#L88).

## Related Packages

- For information about making POD objects, see the
  [`@pcd/pod`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/pod)
  package.

- To see how GPC proofs are created and stored in the Zupass app, see the
  [`@pcd/gpc-pcd`](https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/gpc-pcd)
  package.

- To find the binaries required to prove and verify, see the
  [`@pcd/proto-pod-gpc-artifacts`](https://github.com/proofcarryingdata/snark-artifacts/tree/pre-release/packages/proto-pod-gpc)
  package. Since these artifacts are large and numerous, you generally
  won't want to include this package directly into your app bundle.

## Package Installation

This package will work either in browser or in a Node.js server. Packaging for
a browser requires polyfill for some Node modules, including `buffer` and `constants`.

There is a known issue with a dependency `fastfile` which can be resolved by polyfilling `constants` as you can see in [this example](https://github.com/proofcarryingdata/zukyc/pull/3).

## Stability and Security

POD and GPC libraries are in beta and subject to change. We encourage devs to try them out and use them for apps, but be aware that updates will come in future.

GPC proofs are considered ephemeral (for now), primarily intended for
transactional use cases. Saved proofs may not be verifiable with future versions
of code.

These libraries should not be considered secure enough for highly-sensitive use cases yet. The cryptography, circuits, and configuration compiler have not been audited. The proving/verification keys were generated in good faith by a single author, but are not the result of a distributed trusted setup ceremony.
