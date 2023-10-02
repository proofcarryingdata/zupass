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
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

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

```mermaid
sequenceDiagram
    User app->>User app: constructURL(PCD)
    User app->>Popup route: openPopupRoute(URL)
    Popup route->>Passport popup: redirectToPassportWebapp(URL)
    Passport popup->>Passport popup: getPCD(PCD)
    Passport popup->>Popup route: redirectToPopupRoute(PCD)
    Popup route-->>User app: return <<PCD>>
```

Below, it will be shown how the functions of this package can be used in such a flow.

For more detailed information about the package's functions and types, please refer to the [documentation site](https://docs.pcd.team/modules/_pcd_passport_interface.html).

### Using the passport popup

You can use the [`usePassportPopupSetup`](https://docs.pcd.team/functions/_pcd_passport_interface.usePassportPopupSetup.html) React hook to set up necessary passport popup logic on a specific route (e.g. `/popup`) and communicate with the passport webapp. Basically, it redirects the user to the webapp passport or initial page based on the search parameters of the URL, leveraging cross-origin communication between windows.

```typescript
import { usePassportPopupSetup } from "@pcd/passport-interface"

export default function Popup() {
    const error = usePassportPopupSetup()

    return <div>{error}</div>
}
```

Then the [`usePassportPopupMessages`](https://docs.pcd.team/functions/_pcd_passport_interface.usePassportPopupMessages.html) React hook can be used to process the results of the requests. It listens for incoming [messages](https://developer.mozilla.org/en-US/docs/Web/API/Window/message_event) from the other browsing context (i.e. the popup) and store them in a state variable.

```typescript
import { usePassportPopupMessages } from "@pcd/passport-interface";

export default function App() {
  const [passportPCDString] = usePassportPopupMessages();

  useEffect(() => {
    console.log(passportPCDString);
  }, [passportPCDString]);
}
```

### Adding a PCD to with the passport popup

You can generate a PCD and add it to the passport with [`constructPassportPcdProveAndAddRequestUrl`](https://docs.pcd.team/functions/_pcd_passport_interface.constructPassportPcdProveAndAddRequestUrl.html).

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd"
import { constructPassportPcdProveAndAddRequestUrl, openPassportPopup } from "@pcd/passport-interface"
import { ArgumentTypeName } from "@pcd/pcd-types"

const url = constructPassportPcdProveAndAddRequestUrl<typeof EdDSAPCDPackage>(
    "https://zupass.org",
    window.location.origin + "/popup",
    EdDSAPCDPackage.name,
    {
        id: {
            argumentType: ArgumentTypeName.String
    },
        message: {
            argumentType: ArgumentTypeName.StringArray,,
            value: ["0x32"]
        },
        privateKey: {
            argumentType: ArgumentTypeName.String,
            userProvided: true
        }
    },
    { title: "EdDSA Signature Proof" }
)

openPassportPopup("/popup", url)
```

Or add a previously generated serialized PCD with [`constructPassportPcdAddRequestUrl`](https://docs.pcd.team/functions/_pcd_passport_interface.constructPassportPcdAddRequestUrl.html).

```typescript
import { constructPassportPcdAddRequestUrl, openPassportPopup } from "@pcd/passport-interface"

// This code could be on your server.
const pcd = await prove({
    id: {
        argumentType: ArgumentTypeName.String
    },
    message: {
        argumentType: ArgumentTypeName.StringArray,,
        value: ["0x32"]
    },
    privateKey: {
        argumentType: ArgumentTypeName.String,
        value: "0x42"
    }
})

const serializedPCD = await serialize(pcd)

const url = constructPassportPcdAddRequestUrl(
    "https://zupass.org",
    window.location.origin + "/popup",
    serializedPCD
)

openPassportPopup("/popup", url)
```

### Getting a PCD with the passport popup

You can get a PCD from the passport that already exists in the user's local storage with [`getWithoutProvingUrl`](https://docs.pcd.team/functions/_pcd_passport_interface.getWithoutProvingUrl.html).

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  getWithoutProvingUrl,
  openPassportPopup
} from "@pcd/passport-interface";

const url = getWithoutProvingUrl(
  "https://zupass.org",
  window.location.origin + "/popup",
  EdDSAPCDPackage.name
);

openPassportPopup("/popup", url);
```

Or you can prove a claim and get its PCD with [`constructPassportPcdGetRequestUrl`](https://docs.pcd.team/functions/_pcd_passport_interface.constructPassportPcdGetRequestUrl.html).

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  constructPassportPcdGetRequestUrl,
  openPassportPopup
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";

const url = constructPassportPcdGetRequestUrl<typeof EdDSAPCDPackage>(
  "https://zupass.org",
  window.location.origin + "/popup",
  EdDSAPCDPackage.name,
  {
    id: {
      argumentType: ArgumentTypeName.String
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: ["0x32"]
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      userProvided: true
    }
  }
);

openPassportPopup("/popup", url);
```

### Interacting with the passport webapp directly without popup

If you wish to add or get a PCD from the passport webapp without relying on a popup interface but instead managing the outcome of the request on your server, you can achieve this by specifying an alternative return URL. This return URL could be a designated endpoint on your server, responsible for processing the request and its subsequent actions.

```typescript
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { constructPassportPcdGetRequestUrl } from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";

const url = constructPassportPcdGetRequestUrl<typeof EdDSAPCDPackage>(
  "https://zupass.org",
  "https://your-server.org/verify", // This endpoint will handle the request's results.
  EdDSAPCDPackage.name,
  {
    id: {
      argumentType: ArgumentTypeName.String
    },
    message: {
      argumentType: ArgumentTypeName.StringArray,
      value: ["0x32"]
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      userProvided: true
    }
  },
  {
    genericProveScreen: true
  }
);
```

A real use case could be a Telegram bot that redirects users to the passport webapp to allow them to enter their private key to sign a message and create a EdDSA PCD. The return URL in this case will be an endpoint in the bot's server that adds the user to a Telegram group after verifying the PCD.
