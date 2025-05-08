<p align="center">
    <h1 align="center">
        @pcd/gpcircuits
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/gpcircuits/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/gpcircuits">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/pod-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/gpcircuits">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/gpcircuits.svg?style=flat-square" />
    </a>
<br>
    <a href="https://zupass.org/pod">
        <img alt="Developer Site" src="https://img.shields.io/badge/Developer_Site-green.svg?style=flat-square">
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_gpcircuits.html">
        <img alt="TypeDoc" src="https://img.shields.io/badge/TypeDoc-purple.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpcircuits">
        <img alt="GitHub" src="https://img.shields.io/badge/GitHub-grey.svg?style=flat-square">
    </a>
</p>

A collection of circom circuits and supporting code for zero-knowledge proofs on
PODs (Provable Object Data) via the GPC (General Purpose Circuits) framework.
For a full introduction, see the
[Developer Site](https://zupass.org/pod).

**POD** libraries enable any app to create zero-knowledge proofs of cryptographic data. A POD could represent your ticket to an event, a secure
message, a collectible badge, or an item in a role-playing game. Using PODs,
developers can create ZK-enabled apps without the effort and risk of developing
custom cryptography.

ZK proofs about PODs use General Purpose Circuits (**GPC**) which can prove many
different things about PODs without revealing all details. GPCs use
human-readable configuration and pre-compiled circuits so no knowledge of
circuit programming is required.

PODs and GPCs can be used in Zupass, or in your own apps without Zupass.

## What's in this package?

This package implements the first family of GPC circuits, named `proto-pod-gpc`.
The primary use of the circuits in this package is via a high-level
configuration interpreted by the
[`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
package.

The top level circuit in the family is in
[`proto-pod-gpc.circom`](https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/gpcircuits/circuits/proto-pod-gpc.circom).
That circuit is built using a configurable number of various Modules defined
in the other circom files. If you're a circom developer, you can reuse these
modules to create your own circuits which prove things about PODs which the
GPC configuration doesn't yet support.

Pre-compiled artifacts for these circuits at various sizes are published in the
[`@pcd/proto-pod-gpc-artifacts`](https://github.com/proofcarryingdata/snark-artifacts/tree/pre-release/packages/proto-pod-gpc)
package. They are stored in a dedicated repo due to their size. See the READMEs
in that repo for instructions on compiling and deploying a new version.

In this package you'll also find scripts to generate your own artifacts for a
custom circuit family:

- Edit the `PARAMS` constant in `scripts/paramGen.ts`
- Re-generate parameter lists and top-level circom files: `yarn gen-circuit-parameters`
- Compile circuits to generate artifacts: `yarn gen-artifacts`
- Package artifacts and supporting files into an archive: `yarn package-artifacts`
- You'll find the resulting archive in `artifacts/prod-artifacts.tgz`

## Related Packages

- For information about making POD objects, see the
  [`@pcd/pod`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/pod)
  package.

- For information about making proofs about PODs, see the
  [`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
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
