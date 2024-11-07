<p align="center">
    <h1 align="center">
        @pcd/gpc-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/gpc-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/gpc-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/gpc-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/gpc-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/gpc-pcd.svg?style=flat-square" />
    </a>
<br>
    <a href="https://zupass.org/pod">
        <img alt="Developer Site" src="https://img.shields.io/badge/Developer_Site-green.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/gpcExample.ts#L376">
        <img alt="Tutorial Code" src="https://img.shields.io/badge/Tutorial_Code-blue.svg?style=flat-square">
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_gpc_pcd.html">
        <img alt="TypeDoc" src="https://img.shields.io/badge/TypeDoc-purple.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/gpc-pcd">
        <img alt="GitHub" src="https://img.shields.io/badge/GitHub-grey.svg?style=flat-square">
    </a>
</p>

A PCD representating a ZK proof about one or more POD (Provable Object Data)
objects using a GPC (General Purpose Circuit). For a full introduction, see the
[Developer Site](https://zupass.org/pod).

**POD** libraries enable any app to create zero-knowledge proofs of cryptographic data. A POD could represent your ticket to an event, a secure
message, a collectible badge, or an item in a role-playing game. Using PODs,
developers can create ZK-enabled apps without the effort and risk of developing
custom cryptography.

ZK proofs about PODs use General Purpose Circuits (**GPC**) which can prove many
different things about PODs without revealing all details. GPCs use
human-readable configuration and pre-compiled circuits so no knowledge of
circuit programming is required.

See the [`GPCPCD`](https://docs.pcd.team/classes/_pcd_pod_pcd.PODPCD.html)
class for more details on the data of a GPC PCD.

## Related Packages

- For information about POD objects in Zupass, see the
  [`@pcd/pod-pcd`](https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/pod-pcd)
  package.

- For information about making proofs about PODs, see the
  [`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
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
