<p align="center">
    <h1 align="center">
        @pcd/eddsa-ticket-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/eddsa-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/eddsa-ticket-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/eddsa-ticket-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/eddsa-ticket-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/eddsa-ticket-pcd.svg?style=flat-square" />
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_eddsa_pcd.html">
        <img alt="Docs" src="https://img.shields.io/badge/docs-typedoc-purple.svg?style=flat-square">
    </a>
</p>

| This package defines a PCD designed to verify the authenticity of an event ticket signed using an EdDSA key. It is used in production for Devconnect and Zuconnect events. |
| ------------------------------------------------------------------------------------------------------------ |

## 🛠 Install

Install the `@pcd/eddsa-ticket-pcd` package with npm:

```bash
npm i @pcd/eddsa-ticket-pcd
```

or yarn:

```bash
yarn add @pcd/eddsa-ticket-pcd
```

## 📜 Usage

### Prove

```javascript
import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd"
import { ITicketData, prove } from "@pcd/eddsa-ticket-pcd"
import { ArgumentTypeName } from "@pcd/pcd-types"
import { v4 as uuid } from "uuid";

// Generate a new EdDSA private key.
const privateKey = newEdDSAPrivateKey()

// Prepare the event ticket to sign.
// The following are just dummy values used for testing.
const ticketData: ITicketData = {
    attendeeName: "test name",
    attendeeEmail: "user@test.com",
    eventName: "event",
    ticketName: "ticket",
    checkerEmail: undefined,
    ticketId: uuid(),
    eventId: uuid(),
    productId: uuid(),
    timestampConsumed: 0,
    timestampSigned: Date.now(),
    attendeeSemaphoreId: "12345",
    isConsumed: false,
    isRevoked: false,
    ticketCategory: TicketCategory.Devconnect
}

// Create a PCD with the required attributes and their types.
// It uses the EdDSA PCD to sign the message, which is the serialized ticket in this PCD.
const pcd = await prove({
    // The id is optional and if you don't pass it a random value will be automatically created.
    id: {
        argumentType: ArgumentTypeName.String
    },
    ticket: {
        value: ticketData,
        argumentType: ArgumentTypeName.Object
    },
    privateKey: {
        argumentType: ArgumentTypeName.String,
        value: privateKey
    }
})

console.log(pcd)
/*
EdDSATicketPCD {
  type: 'eddsa-ticket-pcd',
  id: 'd79667d9-ed37-4e38-8e90-487628484fce',
  claim: {
    ticket: {
      attendeeName: 'test name',
      attendeeEmail: 'user@test.com',
      eventName: 'event',
      ticketName: 'ticket',
      checkerEmail: undefined,
      ticketId: '69f7d074-cd96-4ffa-b406-f25ef6abccfd',
      eventId: '22ee4549-fd4d-4814-85e7-d0e7077032f5',
      productId: '9c9af161-6209-431a-953c-589604d5c5c4',
      timestampConsumed: 0,
      timestampSigned: 1696776631601,
      attendeeSemaphoreId: '12345',
      isConsumed: false,
      isRevoked: false,
      ticketCategory: 1
    }
  },
  proof: {
    eddsaPCD: EdDSAPCD {
      type: 'eddsa-pcd',
      id: '2aef80f0-bcdc-4075-b384-90948567cb80',
      claim: [Object],
      proof: [Object]
    }
  }
}
*/
```

### Verify

In most cases, verifying the validity of the PCD with the 'verify' function is not enough. It may also be necessary to ensure that the parameters of the ticket, such as the productId and eventId, match the expected values, and that the public key of the entity that signed the ticket is indeed the authority for that event.

```javascript
import { verify } from "@pcd/eddsa-ticket-pcd"

const isValid = await verify(pcd)

console.log(isValid) // true

// Other possible checks.
pcd.claim.ticket.productId === expectedProductId
pcd.claim.ticket.eventId === expectedEventId
pcd.claim.ticket.eventId === expectedEventId
pcd.proof.eddsaPCD.claim.publicKey[0] === expectedPublicKey[0]
pcd.proof.eddsaPCD.claim.publicKey[1] === expectedPublicKey[1]
```

### Serialize

```javascript
import { serialize } from "@pcd/eddsa-ticket-pcd"

const serialized = await serialize(pcd)

console.log(serialized)
/*
{
  type: 'eddsa-ticket-pcd',
  pcd: '{"id":"c60abbc3-33c6-4d36-9c70-6b3e75888a9c","eddsaPCD":{"type":"eddsa-pcd","pcd":"{\\"type\\":\\"eddsa-pcd\\",\\"id\\":\\"71a8e128-d79f-4730-9115-23cc56c782a3\\",\\"claim\\":{\\"message\\":[\\"b6b2dab7826460db941dff1c0fa51e2\\",\\"91e8b0dbf9de40919d4b7cd8dade3752\\",\\"ca1a03ebaf42478d924922aa6a677b90\\",\\"18b0fc7cfeb\\",\\"18b0fc7cfeb\\",\\"3039\\",\\"0\\",\\"0\\",\\"1\\",\\"0\\",\\"0\\",\\"0\\"],\\"publicKey\\":[\\"1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2\\",\\"1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4\\"]},\\"proof\\":{\\"signature\\":\\"e27ab12b5caabe4dfee9732b57325254e3c286bab650fde134dcdfa4b501fc00fbf9cb70890b81216dfaea04e6aeaf55f02c42a3df99fe2e416572e7b84f6302\\"}}"},"ticket":{"attendeeName":"test name","attendeeEmail":"user@test.com","eventName":"event","ticketName":"ticket","checkerEmail":"undefined","ticketId":"0b6b2dab-7826-460d-b941-dff1c0fa51e2","eventId":"91e8b0db-f9de-4091-9d4b-7cd8dade3752","productId":"ca1a03eb-af42-478d-9249-22aa6a677b90","timestampConsumed":0,"timestampSigned":1696776835051,"attendeeSemaphoreId":"12345","isConsumed":false,"isRevoked":false,"ticketCategory":1}}'
}
*/
```

### Deserialize

```javascript
import { deserialize } from "@pcd/eddsa-ticket-pcd"

const deserialized = await deserialize(serialized.pcd)

console.log(deserialized)
/*
EdDSATicketPCD {
  type: 'eddsa-ticket-pcd',
  id: 'd79667d9-ed37-4e38-8e90-487628484fce',
  claim: {
    ticket: {
      attendeeName: 'test name',
      attendeeEmail: 'user@test.com',
      eventName: 'event',
      ticketName: 'ticket',
      checkerEmail: undefined,
      ticketId: '69f7d074-cd96-4ffa-b406-f25ef6abccfd',
      eventId: '22ee4549-fd4d-4814-85e7-d0e7077032f5',
      productId: '9c9af161-6209-431a-953c-589604d5c5c4',
      timestampConsumed: 0,
      timestampSigned: 1696776631601,
      attendeeSemaphoreId: '12345',
      isConsumed: false,
      isRevoked: false,
      ticketCategory: 1
    }
  },
  proof: {
    eddsaPCD: EdDSAPCD {
      type: 'eddsa-pcd',
      id: '2aef80f0-bcdc-4075-b384-90948567cb80',
      claim: [Object],
      proof: [Object]
    }
  }
}
*/
```
