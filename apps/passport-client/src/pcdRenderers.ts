import { EdDSAFrogPCDTypeName } from "@pcd/eddsa-frog-pcd";
import { EdDSAFrogPCDUI } from "@pcd/eddsa-frog-pcd-ui";
import { EdDSAPCDTypeName } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd";
import { EdDSATicketPCDUI } from "@pcd/eddsa-ticket-pcd-ui";
import { EmailPCDTypeName } from "@pcd/email-pcd";
import { EmailPCDUI } from "@pcd/email-pcd-ui";
import { EthereumOwnershipPCDTypeName } from "@pcd/ethereum-ownership-pcd";
import { EthereumOwnershipPCDUI } from "@pcd/ethereum-ownership-pcd-ui";
import { HaLoNoncePCDTypeName } from "@pcd/halo-nonce-pcd";
import { HaLoNoncePCDUI } from "@pcd/halo-nonce-pcd-ui";
import { PCD, PCDUI } from "@pcd/pcd-types";
import { RSAImagePCDTypeName } from "@pcd/rsa-image-pcd";
import { RSAImagePCDUI } from "@pcd/rsa-image-pcd-ui";
import { RSAPCDTypeName } from "@pcd/rsa-pcd";
import { RSAPCDUI } from "@pcd/rsa-pcd-ui";
import { RSATicketPCDTypeName } from "@pcd/rsa-ticket-pcd";
import { RSATicketPCDUI } from "@pcd/rsa-ticket-pcd-ui";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd";
import { SemaphoreGroupPCDUI } from "@pcd/semaphore-group-pcd-ui";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd";
import { SemaphoreIdentityPCDUI } from "@pcd/semaphore-identity-pcd-ui";
import { SemaphoreSignaturePCDTypeName } from "@pcd/semaphore-signature-pcd";
import { SemaphoreSignaturePCDUI } from "@pcd/semaphore-signature-pcd-ui";
import { ZKEdDSAEventTicketPCDTypeName } from "@pcd/zk-eddsa-event-ticket-pcd";
import { ZKEdDSAEventTicketPCDUI } from "@pcd/zk-eddsa-event-ticket-pcd-ui";

const renderablePCDs = [
  EdDSAPCDTypeName,
  EdDSATicketPCDTypeName,
  EdDSAFrogPCDTypeName,
  EmailPCDTypeName,
  EthereumOwnershipPCDTypeName,
  HaLoNoncePCDTypeName,
  RSAPCDTypeName,
  RSATicketPCDTypeName,
  RSATicketPCDTypeName,
  SemaphoreGroupPCDTypeName,
  SemaphoreIdentityPCDTypeName,
  SemaphoreSignaturePCDTypeName,
  ZKEdDSAEventTicketPCDTypeName,
  RSAImagePCDTypeName
] as const;

export type RenderablePCDType = (typeof renderablePCDs)[number];

export const pcdRenderers: {
  [key in RenderablePCDType]: PCDUI<PCD<unknown, unknown>, unknown>;
} = {
  [EdDSATicketPCDTypeName]: EdDSATicketPCDUI,
  [EdDSAPCDTypeName]: EdDSATicketPCDUI,
  [EdDSAFrogPCDTypeName]: EdDSAFrogPCDUI,
  [EmailPCDTypeName]: EmailPCDUI,
  [EthereumOwnershipPCDTypeName]: EthereumOwnershipPCDUI,
  [HaLoNoncePCDTypeName]: HaLoNoncePCDUI,
  [RSAPCDTypeName]: RSAPCDUI,
  [RSATicketPCDTypeName]: RSATicketPCDUI,
  [SemaphoreGroupPCDTypeName]: SemaphoreGroupPCDUI,
  [SemaphoreIdentityPCDTypeName]: SemaphoreIdentityPCDUI,
  [SemaphoreSignaturePCDTypeName]: SemaphoreSignaturePCDUI,
  [ZKEdDSAEventTicketPCDTypeName]: ZKEdDSAEventTicketPCDUI,
  [RSAImagePCDTypeName]: RSAImagePCDUI
};
