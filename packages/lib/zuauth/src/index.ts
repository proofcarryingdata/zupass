import { EdDSAPublicKey } from "@pcd/eddsa-pcd/EdDSAPCD";
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd/EdDSATicketPCD";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import {
  openZupassPopup,
  receiveZupassPopupMessage
} from "@pcd/passport-interface/PassportPopup/core";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";

interface EventMetadata {
  publicKey: EdDSAPublicKey;
  eventId: string;
  productIds: string[];
}

export class PopupClosedError extends Error {}

interface ZuAuthArgs {
  zupassUrl: string;
  popupRoute: string;
  fieldsToReveal: EdDSATicketFieldsToReveal;
  watermark: string | bigint;
  eventMetadata: EventMetadata;
  externalNullifier?: string | bigint;
  proofTitle?: string;
  proofDescription?: string;
}

export async function zuAuth(args: ZuAuthArgs): Promise<string> {
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

  const popup = openZKEdDSAEventTicketPopup(
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

  return new Promise((resolve, reject) => {
    console.log(popup);
    const closeCheckInterval = window.setInterval(() => {
      if (popup && popup.closed) {
        console.log("popup closed!");
        clearInterval(closeCheckInterval);
        reject(new PopupClosedError());
      }
    }, 100);
    receiveZupassPopupMessage().then((result) => {
      window.clearInterval(closeCheckInterval);
      if (result.type === "pcd") {
        resolve(result.pcdStr);
      } else {
        // Any other result would be invalid
        reject();
      }
    });
  });
}

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
export function openZKEdDSAEventTicketPopup(
  zupassUrl: string,
  popupRoute: string = "popup",
  fieldsToReveal: EdDSATicketFieldsToReveal,
  validEventIds: string[],
  validProductIds: string[],
  publicKey: EdDSAPublicKey,
  watermark: string | bigint,
  externalNullifier?: string | bigint,
  proofTitle: string = "ZKEdDSA Ticket Proof",
  proofDescription: string = "ZKEdDSA Ticket PCD Request"
): Window | null {
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

  const popupUrl = window.location.origin + "/" + popupRoute;

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(zupassUrl, popupUrl, ZKEdDSAEventTicketPCDTypeName, args, {
    genericProveScreen: true,
    title: proofTitle,
    description: proofDescription
  });

  return openZupassPopup(popupUrl, proofUrl);
}
