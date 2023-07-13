import { EthereumOwnershipPCDPackage } from "@pcd/ethereum-ownership-pcd";
import { HaLoNoncePCDPackage } from "@pcd/halo-nonce-pcd";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { WebAuthnPCDPackage } from "@pcd/webauthn-pcd";
import { JubJubSignaturePCDPackage } from "jubjub-signature-pcd";
import { appConfig } from "./appConfig";

let pcdPackages: Promise<PCDPackage[]> | undefined;

export async function getPackages() {
  if (pcdPackages !== undefined) {
    return pcdPackages;
  }

  pcdPackages = loadPackages();
  return pcdPackages;
}

async function loadPackages(): Promise<PCDPackage[]> {
  const SERVER_STATIC_URL = appConfig.passportServer + "/static/";

  await SemaphoreGroupPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
  });

  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
  });

  await EthereumOwnershipPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",
  });

  await RLNPCDPackage.init({
    wasmFilePath: SERVER_STATIC_URL + "rln-artifacts/16.wasm",
    zkeyFilePath: SERVER_STATIC_URL + "rln-artifacts/16.zkey",
  });

  return [
    SemaphoreGroupPCDPackage,
    SemaphoreIdentityPCDPackage,
    SemaphoreSignaturePCDPackage,
    EthereumOwnershipPCDPackage,
    JubJubSignaturePCDPackage,
    RLNPCDPackage,
    WebAuthnPCDPackage,
    HaLoNoncePCDPackage,
    RSAPCDPackage,
    RSATicketPCDPackage,
  ];
}
