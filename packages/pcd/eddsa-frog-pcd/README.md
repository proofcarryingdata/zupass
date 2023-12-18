<p align="center">
    <h1 align="center">
        @pcd/eddsa-frog-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/eddsa-frog-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/eddsa-frog-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/eddsa-frog-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/eddsa-frog-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/eddsa-frog-pcd.svg?style=flat-square" />
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_eddsa_frog_pcd.html">
        <img alt="Docs" src="https://img.shields.io/badge/docs-typedoc-purple.svg?style=flat-square">
    </a>
</p>

| This package defines a PCD designed to verify the authenticity of an object in the FROGCRYPTO universe signed using an EdDSA key. |
| --------------------------------------------------------------------------------------------------------------------------------- |

## 🛠 Install

Install the `@pcd/eddsa-frog-pcd` package with npm:

```bash
npm i @pcd/eddsa-frog-pcd
```

or yarn:

```bash
yarn add @pcd/eddsa-frog-pcd
```

## 📜 Usage

### Prove

```javascript
import { newEdDSAPrivateKey } from "@pcd/eddsa-pcd"
import { IFrogData, prove } from "@pcd/eddsa-frog-pcd"
import { ArgumentTypeName } from "@pcd/pcd-types"
import { v4 as uuid } from "uuid";

// Generate a new EdDSA private key.
const privateKey = newEdDSAPrivateKey()

// Prepare the frog object to sign.
// The following are just dummy values used for testing.
const frogData: IFrogData = {
    name: "test name",
      description: "test description",
      imageUrl: "/frog.png",
      frogId: 0,
      biome: 0,
      rarity: 0,
      temperament: 0,
      jump: 0,
      speed: 0,
      intelligence: 0,
      beauty: 0,
      timestampSigned: Date.now(),
      ownerSemaphoreId: "12345"
}

// Create a PCD with the required attributes and their types.
// It uses the EdDSA PCD to sign the message, which is the serialized data in this PCD.
const pcd = await prove({
    // The id is optional and if you don't pass it a random value will be automatically created.
    id: {
        argumentType: ArgumentTypeName.String
    },
    data: {
        value: frogData,
        argumentType: ArgumentTypeName.Object
    },
    privateKey: {
        argumentType: ArgumentTypeName.String,
        value: privateKey
    }
})

console.log(pcd)
/*
EdDSAFrogPCD {
  type: 'eddsa-frog-pcd',
  id: '3b7617ce-5631-45e7-8cf0-496ae2b4d96f',
  claim: {
    data: {
      name: 'test name',
      description: 'test description',
      imageUrl: '/frog.png',
      frogId: 0,
      biome: 0,
      rarity: 0,
      temperament: 0,
      jump: 0,
      speed: 0,
      intelligence: 0,
      beauty: 0,
      timestampSigned: 1698095960615,
      ownerSemaphoreId: '12345'
    }
  },
  proof: {
    eddsaPCD: EdDSAPCD {
      type: 'eddsa-pcd',
      id: 'a9763be4-b12c-41ca-a8af-6d69669e62c5',
      claim: [Object],
      proof: [Object]
    }
  }
}
*/
```

### Verify

In most cases, verifying the validity of the PCD with the 'verify' function is not enough. It may also be necessary to check the public key of the entity that signed the claim and verify the authenticity of the entity.

```javascript
import { verify } from "@pcd/eddsa-frog-pcd";

const isValid = await verify(pcd);

console.log(isValid); // true

// Other possible checks.
pcd.proof.eddsaPCD.claim.publicKey[0] === expectedPublicKey[0];
pcd.proof.eddsaPCD.claim.publicKey[1] === expectedPublicKey[1];
```

### Serialize

```javascript
import { serialize } from "@pcd/eddsa-frog-pcd";

const serialized = await serialize(pcd);

console.log(serialized);
/*
{
  type: 'eddsa-frog-pcd',
  pcd: '{"id":"b98d9c5f-2077-4953-abeb-dd64d1bcf680","eddsaPCD":{"type":"eddsa-pcd","pcd":"{\\"type\\":\\"eddsa-pcd\\",\\"id\\":\\"af060fbf-b5bd-4edc-bc82-8b5351701339\\",\\"claim\\":{\\"message\\":[\\"0\\",\\"0\\",\\"0\\",\\"0\\",\\"0\\",\\"0\\",\\"0\\",\\"0\\",\\"18b5e68ab1c\\",\\"3039\\",\\"0\\",\\"0\\",\\"0\\"],\\"publicKey\\":[\\"1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2\\",\\"1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4\\"]},\\"proof\\":{\\"signature\\":\\"a8ad5876f708466f68f87c45d3a2849e0a75b8532f302034ee68c47d90f10e82515de475419389445251a5d8473296c61cdcfa8291cf0db682dffd4298d90b04\\"}}"},"data":{"name":"test name","description":"test description","imageUrl":"/frog.png","frogId":0,"biome":0,"rarity":0,"temperament":0,"jump":0,"speed":0,"intelligence":0,"beauty":0,"timestampSigned":1698095999772,"ownerSemaphoreId":"12345"}}'
}
*/
```

### Deserialize

```javascript
import { deserialize } from "@pcd/eddsa-frog-pcd";

const deserialized = await deserialize(serialized.pcd);

console.log(deserialized);
/*
EdDSAFrogPCD {
  type: 'eddsa-frog-pcd',
  id: 'b98d9c5f-2077-4953-abeb-dd64d1bcf680',
  claim: {
    data: [Object: null prototype] {
      name: 'test name',
      description: 'test description',
      imageUrl: '/frog.png',
      frogId: 0,
      biome: 0,
      rarity: 0,
      temperament: 0,
      jump: 0,
      speed: 0,
      intelligence: 0,
      beauty: 0,
      timestampSigned: 1698095999772,
      ownerSemaphoreId: '12345'
    }
  },
  proof: {
    eddsaPCD: EdDSAPCD {
      type: 'eddsa-pcd',
      id: 'af060fbf-b5bd-4edc-bc82-8b5351701339',
      claim: [Object],
      proof: [Object]
    }
  }
}
*/
```
