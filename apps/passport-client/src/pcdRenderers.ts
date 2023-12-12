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
import { PCDUI } from "@pcd/pcd-types";
import { RSAPCDTypeName } from "@pcd/rsa-pcd";
import { RSAPCDUI } from "@pcd/rsa-pcd-ui";
import { RSATicketPCDTypeName } from "@pcd/rsa-ticket-pcd";
import { RSATicketPCDUI } from "@pcd/rsa-ticket-pcd-ui";
import { SemaphoreGroupPCDTypeName } from "@pcd/semaphore-group-pcd";
import { SemaphoreGroupPCDUI } from "@pcd/semaphore-group-pcd-ui";
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
  SemaphoreSignaturePCDTypeName,
  ZKEdDSAEventTicketPCDTypeName
] as const;

type RenderablePCDType = (typeof renderablePCDs)[number];

export const pcdRenderers: { [key in RenderablePCDType]: PCDUI } = {
  "eddsa-ticket-pcd": EdDSATicketPCDUI,
  "eddsa-pcd": EdDSATicketPCDUI,
  "eddsa-frog-pcd": EdDSAFrogPCDUI,
  "email-pcd": EmailPCDUI,
  "ethereum-ownership-pcd": EthereumOwnershipPCDUI,
  "halo-nonce-pcd": HaLoNoncePCDUI,
  "rsa-pcd": RSAPCDUI,
  "rsa-ticket-pcd": RSATicketPCDUI,
  "semaphore-group-signal": SemaphoreGroupPCDUI,
  "semaphore-signature-pcd": SemaphoreSignaturePCDUI,
  "zk-eddsa-event-ticket-pcd": ZKEdDSAEventTicketPCDUI
};
