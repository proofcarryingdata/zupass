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
</p>

| This package contains code that defines the API of the passport server and client, and enables developers (both us, and third party developers) to communicate with those two applications. For example, this package contains code that enables you to construct a URL that requests a particular PCD from the passport webapp. |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |


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

### \# getWithoutProvingUrl

It constructs a URL that requests a PCD from the passport without proving it. 

#### Parameters

| Parameter         | Type   | Description                                                                                             |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| `passportOrigin`  | string | The passport URL origin. It can be the official PCD one or your own instance.                           |
| `returnUrl`       | string | The URL to which the user will be redirected. This is usually a route controlled by the popup passport. |
| `pcdType`         | string | The PCD type that you want to request from the passport.                                                |

#### Return value

URL that will be used by the passport popup to request a PCD.

#### Example

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
