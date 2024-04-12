import { EdDSAPublicKey } from "@pcd/eddsa-pcd/EdDSAPCD";
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd/EdDSATicketPCD";
import { PipelineEventTicketMetadata } from "@pcd/passport-interface";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import {
  PopupActionResult,
  zupassPopupAction
} from "@pcd/passport-interface/PassportPopup/core";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";

/**
 * Arguments required for making ZK proofs about tickets.
 */
export interface ZuAuthArgs {
  zupassUrl: string;
  popupRoute: string;
  fieldsToReveal: EdDSATicketFieldsToReveal;
  watermark: string | bigint;
  // Event metadata comes from Podbox, and identifies the public key, event ID,
  // and product IDs that are issued by a given pipeline.
  // TODO what about multiples of these?
  eventMetadata: PipelineEventTicketMetadata;
  externalNullifier?: string | bigint;
  proofTitle?: string;
  proofDescription?: string;
}

/**
 * Simple wrapper function to make it easy to build authentication flows for
 * EdDSAPCD tickets.
 */
export async function zuAuth(args: ZuAuthArgs): Promise<PopupActionResult> {
  const {
    zupassUrl,
    popupRoute,
    fieldsToReveal,
    watermark,
    eventMetadata,
    externalNullifier,
    proofTitle = "ZKEdDSA Ticket Proof",
    proofDescription = "ZKEdDSA Ticket PCD Request"
  } = args;

  const eventIds: string[] = ([] as string[]).fill(
    eventMetadata.eventId,
    0,
    eventMetadata.productIds.length
  );

  const proofUrl = constructZkTicketProofUrl(
    zupassUrl,
    popupRoute,
    fieldsToReveal,
    eventIds,
    eventMetadata.productIds,
    eventMetadata.publicKey,
    watermark,
    externalNullifier,
    proofTitle,
    proofDescription
  );

  return zupassPopupAction(popupRoute, proofUrl);
}

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
export function constructZkTicketProofUrl(
  zupassUrl: string,
  popupUrl: string,
  fieldsToReveal: EdDSATicketFieldsToReveal,
  validEventIds: string[],
  validProductIds: string[],
  publicKey: EdDSAPublicKey,
  watermark: string | bigint,
  externalNullifier?: string | bigint,
  proofTitle: string = "ZKEdDSA Ticket Proof",
  proofDescription: string = "ZKEdDSA Ticket PCD Request"
): string {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDTypeName,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: validEventIds,
        productIds: validProductIds,
        publicKey,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDTypeName,
      value: undefined,
      userProvided: true
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length !== 0 ? validEventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier
        ? externalNullifier.toString()
        : watermark.toString(),
      userProvided: false
    }
  };
  return constructZupassPcdGetRequestUrl<typeof ZKEdDSAEventTicketPCDPackage>(
    zupassUrl,
    popupUrl,
    ZKEdDSAEventTicketPCDTypeName,
    args,
    {
      genericProveScreen: true,
      title: proofTitle,
      description: proofDescription
    }
  );
}
