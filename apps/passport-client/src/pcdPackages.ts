import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { EthereumGroupPCDPackage } from "@pcd/ethereum-group-pcd";
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
import { ZKEdDSATicketPCDPackage } from "@pcd/zk-eddsa-ticket-pcd";
import { appConfig } from "./appConfig";
import { makeEncodedVerifyLink } from "./qr";

let pcdPackages: Promise<PCDPackage[]> | undefined;

export async function getPackages(): Promise<PCDPackage[]> {
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
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await SemaphoreSignaturePCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await EthereumOwnershipPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey"
  });

  await EthereumGroupPCDPackage.init({
    wasmFilePath: "/semaphore-artifacts/16.wasm",
    zkeyFilePath: "/semaphore-artifacts/16.zkey",

    // TODO: update these to point to pcd pass' static server
    addrMembershipConfig: {
      circuit:
        "https://storage.googleapis.com/personae-proving-keys/membership/addr_membership.circuit",
      witnessGenWasm:
        "https://storage.googleapis.com/personae-proving-keys/membership/addr_membership.wasm"
    },

    pubkeyMembershipConfig: {
      circuit:
        "https://storage.googleapis.com/personae-proving-keys/membership/pubkey_membership.circuit",
      witnessGenWasm:
        "https://storage.googleapis.com/personae-proving-keys/membership/pubkey_membership.wasm"
    }
  });

  await RLNPCDPackage.init({
    wasmFilePath: SERVER_STATIC_URL + "rln-artifacts/16.wasm",
    zkeyFilePath: SERVER_STATIC_URL + "rln-artifacts/16.zkey"
  });

  await RSATicketPCDPackage.init({
    makeEncodedVerifyLink
  });

  await EdDSATicketPCDPackage.init({
    makeEncodedVerifyLink
  });

  await EdDSAPCDPackage.init({});

  await ZKEdDSATicketPCDPackage.init({
    wasmFilePath: "/zkeddsa-artifacts-unsafe/eddsaTicket.wasm",
    zkeyFilePath: "/zkeddsa-artifacts-unsafe/circuit_final.zkey"
  });

  return [
    SemaphoreGroupPCDPackage,
    SemaphoreIdentityPCDPackage,
    SemaphoreSignaturePCDPackage,
    EthereumOwnershipPCDPackage,
    EthereumGroupPCDPackage,
    RLNPCDPackage,
    WebAuthnPCDPackage,
    HaLoNoncePCDPackage,
    RSAPCDPackage,
    RSATicketPCDPackage,
    EdDSAPCDPackage,
    EdDSATicketPCDPackage,
    ZKEdDSATicketPCDPackage
  ];
}
