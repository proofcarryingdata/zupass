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

| This package defines a PCD representing an EdDSA signature of a list of BigInts with a public-private keypair. |
| -------------------------------------------------------------------------------------------------------------- |

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
// Derive the matching public key.
const publicKey = await getEdDSAPublicKey(privateKey)
// Prepare the message to sign 
// nb. it must be an array of bigints in hex string format.
const message = [BigInt(0).toString(16), BigInt(1).toString(16), BigInt(2).toString(16)]
// Prepare the input arguments for the PCD.
const pcdArgs = {
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
}
console.log(`Your private key ${privateKey}\nYour public key ${publicKey}\nYour message ${message}`)
/*
    Private key: f04344b3c6d07f5bda3c0ed6ee613c3d20a5e9ff07c1932d8161ae2490789b08
    Public key: 4366d11e8274843402cb657299b15260581f6a4610fcb0a812abf43a5197d309,7e4dce0c33305d62b36a8cc91327a57f65f3140064d51c82950aef827a3d4514
    Message: 0,1,2
    {
        id: { argumentType: 'String' },
        message: { argumentType: 'StringArray', value: [ '0', '1', '2' ] },
        privateKey: {
            argumentType: 'String',
            value: 'f04344b3c6d07f5bda3c0ed6ee613c3d20a5e9ff07c1932d8161ae2490789b08'
        }
    }
*/

// Prove that you know a certain EdDSA private key (ie., pcd).
const pcd = await prove(pcdArgs)
console.log(`PCD ${pcd.type} #${pcd.id}\nMessage ${pcd.claim.message}\nPublic key ${pcd.claim.publicKey}\nSignature ${pcd.proof.signature}`)
/*
    PCD eddsa-pcd #eecdce73-51fd-408c-a4d0-5f0a37919ec3
    Message: 0,1,2
    Public key: 4366d11e8274843402cb657299b15260581f6a4610fcb0a812abf43a5197d309,7e4dce0c33305d62b36a8cc91327a57f65f3140064d51c82950aef827a3d4514
    Signature: 3b042222f4387f27779e11c04826da586674da827e7d358d753a4e15eec8338f084fe63cbada3184ba33c3cc65c5d08808feef1a938d6b2be0ab0a636faf6900
*/
```

### Verify
```javascript
import { verify } from "@pcd/eddsa-pcd"
// ... pcd = prove(args)

const check = await verify(pcd)
console.log(`${pcd.type} #${pcd.id} is ${check ? `correct` : `invalid`}`)
// eddsa-pcd #eecdce73-51fd-408c-a4d0-5f0a37919ec3 is correct

```

### Serialize your PCD
```javascript
import { serialize } from "@pcd/eddsa-pcd"
// ... pcd = prove(args)

const serialized = await serialize(pcd)
console.log(serialized)
/*
    {
    type: 'eddsa-pcd',
    pcd: '{"type":"eddsa-pcd","id":"eecdce73-51fd-408c-a4d0-5f0a37919ec3","claim":{"message":["0","1","2"],"publicKey":["4366d11e8274843402cb657299b15260581f6a4610fcb0a812abf43a5197d309","7e4dce0c33305d62b36a8cc91327a57f65f3140064d51c82950aef827a3d4514"]},"proof":{"signature":"3b042222f4387f27779e11c04826da586674da827e7d358d753a4e15eec8338f084fe63cbada3184ba33c3cc65c5d08808feef1a938d6b2be0ab0a636faf6900"}}'
    }
*/
```

### Deserialize your PCD
```javascript
import { deserialize } from "@pcd/eddsa-pcd"
// ... pcd = prove(args)

const deserialized = await deserialize(serialized.pcd)
console.log(deserialized)
/*
    {
        type: 'eddsa-pcd',
        id: 'eecdce73-51fd-408c-a4d0-5f0a37919ec3',
        claim: {
            message: [ 0n, 1n, 2n ],
            publicKey: [
            '4366d11e8274843402cb657299b15260581f6a4610fcb0a812abf43a5197d309',
            '7e4dce0c33305d62b36a8cc91327a57f65f3140064d51c82950aef827a3d4514'
            ]
        },
        proof: {
            signature: '3b042222f4387f27779e11c04826da586674da827e7d358d753a4e15eec8338f084fe63cbada3184ba33c3cc65c5d08808feef1a938d6b2be0ab0a636faf6900'
        }
    }
*/
```