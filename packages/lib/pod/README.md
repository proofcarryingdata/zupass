<p align="center">
    <h1 align="center">
        @pcd/pod
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img alt="PCD" src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/lib/pod/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/pod">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/pod-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/pod">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/pod.svg?style=flat-square" />
    </a>
<br>
    <a href="https://pod.org/pod/introduction">
        <img alt="Developer Site" src="https://img.shields.io/badge/Developer_Site-green.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/podExample.ts#L57">
        <img alt="Tutorial Code" src="https://img.shields.io/badge/Tutorial_Code-blue.svg?style=flat-square">
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_pod.html">
        <img alt="TypeDoc" src="https://img.shields.io/badge/TypeDoc-purple.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/pod">
        <img alt="GitHub" src="https://img.shields.io/badge/GitHub-grey.svg?style=flat-square">
    </a>
</p>

A library for creating and manipulating objects in the Provable Object Data
format. For a full introduction, see the
[Developer Site](https://pod.org/pod/introduction).

**POD** libraries enable any app to create zero-knowledge proofs of cryptographic data. A POD could represent your ticket to an event, a secure
message, a collectible badge, or an item in a role-playing game. Using PODs,
developers can create ZK-enabled apps without the effort and risk of developing
custom cryptography.

ZK proofs about PODs use General Purpose Circuits (**GPC**) which can prove many
different things about PODs without revealing all details. GPCs use
human-readable configuration and pre-compiled circuits so no knowledge of
circuit programming is required.

PODs and GPCs can be used in Zupass, or in your own apps without Zupass.

## What is a POD?

To a user, a POD is a piece of cryptographic data attested by some issuing
authority. For a developer, a POD object is a key-value store which can hold
any data. The whole POD is signed by an issuer. Apps can verify the signature,
to trust the authenticity of the values in the POD.

When a POD is issued, its entries (key-value pairs) are hashed as part of a
Merkle tree. This allows GPCs to selectively prove about individual entries
without revealing the whole POD.

```TypeScript
const podSword = POD.sign(
  {
    pod_type: { type: "string", value: "myrpg.item.weapon" },
    attack: { type: "int", value: 7n },
    weaponType: { type: "string", value: "sword" },
    itemSet: { type: "string", value: "celestial" },
    isMagical: { type: "boolean", value: true },
    owner: { type: "eddsa_pubkey", value: purchaser.pubKey }
  } satisfies PODEntries,
  privateKey
);
```

## Entry Points

- The [`PODEntries`](https://docs.pcd.team/types/_pcd_pod.PODEntries.html)
  type represents names and values in a POD. Start there to learn what
  a POD can represent.
- The [`POD`](https://docs.pcd.team/classes/_pcd_pod.POD.html) class represents
  a signed POD, which you can create by signing with your private key, or load
  with an existing signature.
- The [`PODContent`](https://docs.pcd.team/classes/_pcd_pod.PODContent.html)
  class links POD entries together into a Merkle tree and provides Map-like
  accessors for named values.

For more details on usage, check out the
[tutorial code](https://github.com/proofcarryingdata/zupass/blob/main/examples/pod-gpc-example/src/podExample.ts#L57).

## Related Packages

- For information about making proofs about PODs, see the
  [`@pcd/gpc`](https://github.com/proofcarryingdata/zupass/tree/main/packages/lib/gpc)
  package.

- To see how PODs are created and stored in the Zupass app, see the
  [`@pcd/pod-pcd`](https://github.com/proofcarryingdata/zupass/tree/main/packages/pcd/pod-pcd)
  package.

## Package Installation

This package will work either in browser or in a Node.js server. Packaging for
a browser requires polyfill for some Node modules, including `buffer`.

## Stability and Security

POD and GPC libraries are in beta and subject to change. We encourage devs to try them out and use them for apps, but be aware that updates will come in future.

The PODs themselves are persistent data, and we expect to maintain
backward-compatibility when we make changes to the format. Library interfaces
may also change. Any breaking changes will be reflected in the NPM versions
using standard semantic versioning.
