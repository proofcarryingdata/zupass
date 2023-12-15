<p align="center">
    <h1 align="center">
        @pcd/eddsa-pcd
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/eddsa-pcd/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/eddsa-pcd">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/eddsa-pcd?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/eddsa-pcd">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/eddsa-pcd.svg?style=flat-square" />
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_eddsa_pcd.html">
        <img alt="Docs" src="https://img.shields.io/badge/docs-typedoc-purple.svg?style=flat-square">
    </a>
</p>

| This package defines a PCD designed to verify the authenticity of a message signed using an EdDSA key. |
| ------------------------------------------------------------------------------------------------------ |

## 🛠 Install

Install the `@pcd/eddsa-pcd` package with npm:

```bash
npm i @pcd/eddsa-pcd
```

or yarn:

```bash
yarn add @pcd/eddsa-pcd
```

## 📜 Usage

### Prove

```javascript
import { getEdDSAPublicKey, newEdDSAPrivateKey, prove } from "@pcd/eddsa-pcd"
import { ArgumentTypeName } from "@pcd/pcd-types"

// Generate a new EdDSA private key.
const privateKey = newEdDSAPrivateKey()

// Prepare the message to sign.
// It must be a list of hexadicimal strings.
const message = ["0xc", "0x7a", "0x8f"]

// Create a PCD with the required attributes and their types.
const pcd = await prove({
    // The id is optional and if you don't pass it a random value will be automatically created.
    id: {
        argumentType: ArgumentTypeName.String
    },
    message: {
        argumentType: ArgumentTypeName.StringArray,
        value: message
    },
    privateKey: {
        argumentType: ArgumentTypeName.String,
        value: privateKey
    }
})

console.log(pcd)
/*
EdDSAPCD {
  type: 'eddsa-pcd',
  id: '4c80affc-12c3-4d93-8983-cc38295ad31b',
  claim: {
    message: [ 12n, 122n, 143n ],
    publicKey: [
      '1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2',
      '1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4'
    ]
  },
  proof: {
    signature: '39166dd6187378e2ef24d183bffe5bd1b2114344fcd5a56db562a12859c03b9a53b2f98de0b7d4f23dc49979d0e8f919f428a37e736163f7426259c13ecb7000'
  }
}
*/
```

### Verify

```javascript
import { verify } from "@pcd/eddsa-pcd"

const isValid = await verify(pcd)

console.log(isValid) // true
```

### Serialize

```javascript
import { serialize } from "@pcd/eddsa-pcd"

const serialized = await serialize(pcd)

console.log(serialized)
/*
{
  type: 'eddsa-pcd',
  pcd: '{"type":"eddsa-pcd","id":"15bcc6ec-3482-4772-8a67-27630f8641c5","claim":{"message":["c","7a","8f"],"publicKey":["1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2","1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4"]},"proof":{"signature":"71907bb4a1b5e27b2b9df54ac5cbebb45958f673b97030a79a3799e54ed3779eb499e710bb02231d9f9b6bb621375de7a68ad53bc3e5cef35c6531f9440d8d05"}}'
}
*/
```

### Deserialize

```javascript
import { deserialize } from "@pcd/eddsa-pcd"

const deserialized = await deserialize(serialized.pcd)

console.log(deserialized)
/*
EdDSAPCD {
  type: 'eddsa-pcd',
  id: '4c80affc-12c3-4d93-8983-cc38295ad31b',
  claim: {
    message: [ 12n, 122n, 143n ],
    publicKey: [
      '1d5ac1f31407018b7d413a4f52c8f74463b30e6ac2238220ad8b254de4eaa3a2',
      '1e1de8a908826c3f9ac2e0ceee929ecd0caf3b99b3ef24523aaab796a6f733c4'
    ]
  },
  proof: {
    signature: '39166dd6187378e2ef24d183bffe5bd1b2114344fcd5a56db562a12859c03b9a53b2f98de0b7d4f23dc49979d0e8f919f428a37e736163f7426259c13ecb7000'
  }
}
*/
```
