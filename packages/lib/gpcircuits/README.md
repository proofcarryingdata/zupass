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
    <a href="https://zupass.org/pod-developers">
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
[Developer Site](https://zupass.org/pod-developers).

**POD** is a format enabling any app to flexibly create cryptographic data and
make zero-knowledge proofs about it. A POD could represent your ticket to an
event, a secure message, a collectible badge, or an item in a role-playing game.
Using PODs, developers can create ZK-enabled apps without the effort and risk of
developing their own cryptography.

ZK proofs about PODs use General Purpose Circuits (**GPC**) which can prove many
different things about a POD without revealing it all. GPCs use human-readable
configuration and pre-compiled circuits so no knowledge of circuit programming
is required.

PODs and GPCs can be used in Zupass, or in your own apps without Zupass.

## What's in this package?

This package implements the first prototype family of GPC circuits, named
`proto-pod-gpc`. The primary use of the circuits in this package is via
a high-level configuration interpreted by the
[`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
package.

The top level circuit in the family is in
[`proto-pod-gpc.circom`](https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/gpcircuits/circuits/proto-pod-gpc.circom).
That circuit is built using a configurable number of different Modules defined
in the other circom files. If you're a circom developer, you can reuse these
modules to create your own circuits which prove things about PODs which the
GPC configuration doesn't yet support.

Pre-compiled artifacts for these circuits at various sizes are published in the
[`@pcd/proto-pod-gpc-artifacts`](https://github.com/proofcarryingdata/snark-artifacts/tree/pre-release/packages/proto-pod-gpc)
package. They are stored in a dedicated repo due to their size.

## Related Packages

- For information about making POD objects, see the
  [`@pcd/pod`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/pod)
  package.

- For information about making proofs about PODs, see the
  [`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
  package.

- To interact with GPC proofs in the Zupass app, see the
  [`@pcd/gpc-pcd`](https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/gpc-pcd)
  package.

- To find the binaries required to prove and verify, see the
  [`@pcd/proto-pod-gpc-artifacts`](https://github.com/proofcarryingdata/snark-artifacts/tree/pre-release/packages/proto-pod-gpc)
  package. Since these artifacts are large and numerous, you generally
  won't want to depend on this package directly.

## Stability and Security

POD and GPC libraries are experimental and subject to change. We encourage devs
to try them out and use them for apps, but maybe don’t rely on them for the most
sensitive use cases yet.

GPC proofs are considered ephemeral (for now), primarily intended for
transactional use cases. Saved proofs may not be verifiable with future
versions of code. Library interfaces may also change. Any breaking changes will
be reflected in the NPM versions using standard semantic versioning.

These libraries should not be considered secure enough for highly-sensitive use
cases yet. The circuits are experimental and have not been audited. The
proving/verification keys were generated in good faith by a single author, but
are not the result of a distributed trusted setup ceremony.
