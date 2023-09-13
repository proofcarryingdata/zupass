<p align="center">
    <h1 align="center">
        @pcd/passport-interface
    </h1>
</p>

<p align="center">
    <a href="https://github.com/proofcarryingdata">
        <img src="https://img.shields.io/badge/project-PCD-blue.svg?style=flat-square">
    </a>
    <a href="https://github.com/proofcarryingdata/zupass/blob/main/packages/passport-interface/LICENSE">
        <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square">
    </a>
    <a href="https://www.npmjs.com/package/@pcd/passport-interface">
        <img alt="NPM version" src="https://img.shields.io/npm/v/@pcd/passport-interface?style=flat-square" />
    </a>
    <a href="https://npmjs.org/package/@pcd/passport-interface">
        <img alt="Downloads" src="https://img.shields.io/npm/dm/@pcd/passport-interface.svg?style=flat-square" />
    </a>
    <a href="https://docs.pcd.team/modules/_pcd_passport_interface.html">
        <img alt="Docs" src="https://img.shields.io/badge/docs-typedoc-purple.svg?style=flat-square">
    </a>
</p>

| This package contains code that defines the API of the passport server and client, and enables developers (both us, and third party developers) to communicate with those two applications. For example, this package contains code that enables you to construct a URL that requests a particular PCD from the passport webapp. |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |


## 🛠 Install

Install the `@pcd/passport-interface` package with npm:

```bash
npm i @pcd/passport-interface
```

or yarn:

```bash
yarn add @pcd/passport-interface
```

## 📜 Usage

The communication between users and passport webapp is mostly via a popup, which redirects to the webapp according to the URL and its search parameters in the same popup. Once the webapp generates the requested content, the popup automatically closes, and the resulting content can be accessed through a React hook.

For more detailed information about the package's functions and types, please refer to the [documentation site](https://docs.pcd.team/modules/_pcd_passport_interface.html).

### Using the passport popup

You can use the `usePassportPopupSetup` React hook to set up necessary passport popup logic on a specific route (e.g. `/popup`) and communicate with the passport webapp.

```typescript
import { usePassportPopupSetup } from "@pcd/passport-interface"

export default function Popup() {
    const error = usePassportPopupSetup()

    return <div>{error}</div>
}
```

Then the `usePassportPopupMessages` React hook can be used to process the results of your requests.

```typescript
import { usePassportPopupMessages } from "@pcd/passport-interface"

export default function App() {
    const [passportPCDString] = usePassportPopupMessages()

     useEffect(() => {
        console.log(passportPCDString)
    }, [passportPCDString])
}
```

### Adding a PCD to the passport

You can generate a PCD and add it to the passport.

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd"
import { constructPassportPcdProveAndAddRequestUrl, openPassportPopup } from "@pcd/passport-interface"
import { ArgumentTypeName } from "@pcd/pcd-types"

const url = constructPassportPcdProveAndAddRequestUrl<typeof EdDSAPCDPackage>(
    process.env.PCDPASS_URL, // e.g. https://zupass.org.
    window.location.origin + "/popup",
    EdDSAPCDPackage.name,
    {
        id: {
            argumentType: ArgumentTypeName.String
    },
        message: {
            argumentType: ArgumentTypeName.StringArray,
            value: ["0x342"]
        },
        privateKey: {
            argumentType: ArgumentTypeName.String,
            value: "0x42"
        }
    },
    { title: "EdDSA Signature Proof" }
)

openPassportPopup("/popup", url)
```

Or add a previously generated serialized PCD.

```typescript
import { constructPassportPcdAddRequestUrl, openPassportPopup } from "@pcd/passport-interface"

const url = constructPassportPcdAddRequestUrl(
    process.env.PCDPASS_URL, // e.g. https://zupass.org.
    window.location.origin + "/popup",
    serializedPCD
)

openPassportPopup("/popup", url)
```

### Getting a PCD from the passport

You can get a PCD from the passport without any proof.

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd"
import { getWithoutProvingUrl, openPassportPopup } from "@pcd/passport-interface"

const url = getWithoutProvingUrl(
  process.env.PCDPASS_URL, // e.g. https://zupass.org.
  window.location.origin + "/popup", // The popup route.
  EdDSAPCDPackage.name // Name of PCD type.
)

openPassportPopup("/popup", url)
```

Or proving it.

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd"
import { constructPassportPcdGetRequestUrl, openPassportPopup } from "@pcd/passport-interface"
import { ArgumentTypeName } from "@pcd/pcd-types"

const url = constructPassportPcdGetRequestUrl(
    process.env.PCDPASS_URL as string,
    window.location.origin + "/popup",
    EdDSAPCDPackage.name,
    {
        id: {
            argumentType: ArgumentTypeName.String
        },
        message: {
            argumentType: ArgumentTypeName.StringArray,
            value: ["0x342"]
        },
        privateKey: {
            argumentType: ArgumentTypeName.String,
            value: "0x324"
        }
    }
)

openPassportPopup("/popup", url)
```
