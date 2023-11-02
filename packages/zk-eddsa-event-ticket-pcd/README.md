<p align="center">
    <h1 align="center">
        @pcd/zk-eddsa-event-ticket-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/zk-eddsa-event-ticket-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/zk-eddsa-event-ticket-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/zk-eddsa-event-ticket-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/zk-eddsa-event-ticket-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/zk-eddsa-event-ticket-pcd.svg?style=flat-square" />
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_zk_eddsa_event_ticket_pcd.html">
        <img alt="Docs" src="https://img.shields.io/badge/docs-typedoc-purple.svg?style=flat-square">
    </a>
</p>

| This package defines a PCD representing a proof of ownership of an EdDSA-signed ticket. The prover can prove ownership of a ticket corresponding to their semaphore identity, and optionally prove the ticket corresponds to one of a list of valid events. The prover can keep their identity private, and selectively reveal some or none of the individual ticket fields. To harden against various abuses, the proof can be watermarked and can include a nullifier. It is used in production for Devconnect and Zuconnect events. |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## 🛠 Install

Install the `@pcd/zk-eddsa-event-ticket-pcd` package with npm:

```bash
npm i @pcd/zk-eddsa-event-ticket-pcd
```

or yarn:

```bash
yarn add @pcd/zk-eddsa-event-ticket-pcd
```

## 📜 Usage

### Prove

```javascript
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd"
import { prove, EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd"
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd"
import { ArgumentTypeName } from "@pcd/pcd-types"

// Specifies which fields of an EdDSATicket should be revealed in a proof.
const fieldsToReveal: EdDSATicketFieldsToReveal = {
    revealEventId: true,
    revealProductId: true
}

// Optional field. If included the PCD proves that the ticket's event ID is in this list.
const validEventIds: string[] = [
    "5de90d09-22db-40ca-b3ae-d934573def8b",
    "91312aa1-5f74-4264-bdeb-f4a3ddb8670c"
];

// Create a PCD with the required attributes and their types.
const pcd = await prove({
    ticket: {
        value: serializedTicketPCD, // See `@pcd/eddsa-ticket-pcd`
        argumentType: ArgumentTypeName.PCD,
        pcdType: EdDSATicketPCDTypeName
    },
    identity: {
        value: serializedIdentityPCD, // See `@pcd/semaphore-identity-pcd`
        argumentType: ArgumentTypeName.PCD,
        pcdType: SemaphoreIdentityPCDTypeName
    },
    fieldsToReveal: {
        value: fieldsToReveal,
        argumentType: ArgumentTypeName.ToggleList
    },
    validEventIds: {
        value: validEventIds,
        argumentType: ArgumentTypeName.StringArray
    },
    externalNullifier: {
        value: BigInt(42),
        argumentType: ArgumentTypeName.BigInt
    },
    watermark: {
        value: BigInt(6),
        argumentType: ArgumentTypeName.BigInt
    }
})

console.log(pcd)
/*
ZKEdDSAEventTicketPCD {
  id: '97ce7343-41d3-4f7e-9ff7-73106dfd19a6',
  claim: {
    partialTicket: {
      eventId: '5de90d09-22db-40ca-b3ae-d934573def8b',
      productId: '5ba4cd9e-893c-4a4a-b15b-cf36ceda1938',
    },
    watermark: '6',
    signer: [
      '05e0c4e8517758da3a26c80310ff2fe65b9f85d89dfc9c80e6d0b6477f88173e',
      '29ae64b615383a0ebb1bc37b3a642d82d37545f0f5b1444330300e4c4eedba3f'
    ],
    validEventIds: [
      '5de90d09-22db-40ca-b3ae-d934573def8b',
      '91312aa1-5f74-4264-bdeb-f4a3ddb8670c'
    ],
    nullifierHash: '3274096054339022316849264005001410229267039041491435524911654863522670547901',
    externalNullifier: '42'
  },
  proof: {
    pi_a: [
      '18249213894697822800519267926597327586160659278562101066428317833706599223012',
      '9070874747338604993528487902589737341620511987605447082679171141953075961628',
      '1'
    ],
    pi_b: [ [Array], [Array], [Array] ],
    pi_c: [
      '6552803750407089469953623862283305498767762509851680634912810645071924431839',
      '4990898918124769898552980957644133821908719911227741582177714406263185817178',
      '1'
    ],
    protocol: 'groth16',
    curve: 'bn128'
  },
  type: 'zk-eddsa-event-ticket-pcd'
}
*/
```

### Verify

In most cases, verifying the validity of the PCD with the 'verify' function is not enough. It may also be necessary to ensure that the parameters of the ticket, such as the productId and eventId, match the expected values, and that the public key of the entity that signed the ticket is indeed the authority for that event.

```javascript
import { verify } from "@pcd/zk-eddsa-event-ticket-pcd"

const isValid = await verify(pcd)

console.log(isValid) // true

// Other possible checks.
pcd.claim.partialTicket.productId === expectedProductId
pcd.claim.partialTicket.eventId === expectedEventId
pcd.claim.signer[0] === expectedPublicKey[0]
pcd.claim.signer[1] === expectedPublicKey[1]
```

### Serialize

```javascript
import { serialize } from "@zk-eddsa-event-ticket-pcd"

const serializedPCD = await serialize(pcd)
```

### Deserialize

```javascript
import { deserialize } from "@pcd/eddsa-ticket-pcd"

const pcd = await deserialize(serializedPCD.pcd)
```
