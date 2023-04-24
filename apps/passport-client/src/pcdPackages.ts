import { EthereumOwnershipPCDPackage } from "@pcd/ethereum-ownership-pcd";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { WebAuthnPCDPackage } from "@pcd/webauthn-pcd";
import { JubJubSignaturePCDPackage } from "jubjub-signature-pcd";
import { config } from "./config";

let pcdPackages: Promise<PCDPackage[]> | undefined;

export async function getPackages() {
  if (pcdPackages !== undefined) {
    return pcdPackages;
  }

  pcdPackages = loadPackages();
  return pcdPackages;
}

async function loadPackages(): Promise<PCDPackage[]> {
  const SERVER_STATIC_URL = config.passportServer + "/static/";

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
  ];
}
