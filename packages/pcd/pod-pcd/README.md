<p align="center">
    <h1 align="center">
        @pcd/pod-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/pcd/pod-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/pod-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/pod-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/pod-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/pod-pcd.svg?style=flat-square" />
    </a>
<br>
    <a href="https://zupass.org/pod">
        <img alt="Developer Site" src="https://img.shields.io/badge/Developer_Site-green.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/podExample.ts#L214">
        <img alt="Tutorial Code" src="https://img.shields.io/badge/Tutorial_Code-blue.svg?style=flat-square">
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_pod_pcd.html">
        <img alt="TypeDoc" src="https://img.shields.io/badge/TypeDoc-purple.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/pod-pcd">
        <img alt="GitHub" src="https://img.shields.io/badge/GitHub-grey.svg?style=flat-square">
    </a>
</p>

A PCD representating an object in the **POD** (Provable Object Data) format,
allowing it to be manipulated by generic apps like Zupass.
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

See the [`PODPCD`](https://docs.pcd.team/classes/_pcd_pod_pcd.PODPCD.html)
class for more details on the data of a POD PCD.

## Related Packages

- For information about making POD objects, see the
  [`@pcd/pod`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/pod)
  package.

- For information about making proofs about PODs in Zupass, see the
  [`@pcd/gpc-pcd`](https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/gpc-pcd)
  package.

## Package Installation

This package will work either in browser or in a Node.js server. Packaging for
a browser requires polyfill for some Node modules, including `buffer`.

## Stability and Security

POD and GPC libraries are in beta and subject change. We encourage devs to try them out and use them for apps, but be aware that updates will come in future.

The PODs themselves are persistent data, and we expect to maintain
backward-compatibility when we make changes to the format. Library interfaces
may also change. Any breaking changes will be reflected in the NPM versions
using standard semantic versioning.
