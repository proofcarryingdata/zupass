import type { EdDSAPublicKey } from "@pcd/eddsa-crypto";
import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd/EdDSATicketPCD";
import type { PipelineEdDSATicketZuAuthConfig } from "@pcd/passport-interface";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import {
  PopupActionResult,
  zupassPopupExecute,
  zupassPopupSetup
} from "@pcd/passport-interface/PassportPopup/core";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";

// For convenience, re-export this here so that consumers don't need to install
// and import from `@pcd/passport-interface` directly.
export { zupassPopupSetup };

/**
 * Arguments required for making ZK proofs about tickets.
 */
export interface ZuAuthArgs {
  zupassUrl?: string;
  returnUrl?: string;
  fieldsToReveal: EdDSATicketFieldsToReveal;
  watermark: string | bigint;
  // Config comes from Podbox, and identifies the public key, event ID,
  // and product IDs that are used for issuance by a given pipeline.
  config: PipelineEdDSATicketZuAuthConfig[];
  externalNullifier?: string | bigint;
  proofTitle?: string;
  proofDescription?: string;
}

export interface ZuAuthRedirectArgs extends ZuAuthArgs {
  returnUrl: string;
}

/**
 * Opens a popup window to the Zupass prove screen.
 */
export async function zuAuthPopup(
  args: ZuAuthArgs
): Promise<PopupActionResult> {
  const proofUrl = constructZkTicketProofUrl(args);
  return zupassPopupExecute(proofUrl);
}

/**
 * Navigates to the Zupass prove screen.
 */
export function zuAuthRedirect(args: ZuAuthRedirectArgs): void {
  const proofUrl = constructZkTicketProofUrl(args);
  window.location.href = proofUrl;
}

/**
 * Constructs a URL to the Zupass prove screen for a ZKEdDSAEventTicketPCD
 * zero-knowlege proof.
 */
export function constructZkTicketProofUrl(zuAuthArgs: ZuAuthArgs): string {
  const {
    zupassUrl = "https://zupass.org",
    returnUrl,
    fieldsToReveal,
    watermark,
    config,
    externalNullifier,
    proofTitle,
    proofDescription
  } = zuAuthArgs;

  const eventIds: string[] = [],
    productIds: string[] = [],
    publicKeys: EdDSAPublicKey[] = [];

  /**
   * {@link constructZupassPcdGetRequestUrl} takes a set of parameters which it
   * uses to build a prove screen. Some of these are passed through to the
   * `getProveDisplayOptions` function of the relevant {@link PCDPackage},
   * which in this case is {@link ZKEdDSAEventTicketPCDPackage}.
   *
   * This package supports custom options, where the parameters can contain a
   * list of event IDs and a list of product IDs. However, it is designed to
   * support two specific scenarios:
   * 1) the lists of event IDs and product IDs are of exactly equal length
   * 2) the list of product IDs is empty
   *
   * So, the user can pass in a configuration to ZuAuth in which each item has
   * both an event ID and a product ID, or in which each item has an event ID
   * and no product ID, but can't mix the two.
   */
  for (const em of config) {
    if (em.productId) {
      if (eventIds.length > productIds.length) {
        throw new Error(
          "It is not possible to mix events with product IDs and events without product IDs"
        );
      }
      productIds.push(em.productId);
    }
    if (!em.productId && productIds.length > 0) {
      throw new Error(
        "It is not possible to mix events with product IDs and events without product IDs"
      );
    }
    eventIds.push(em.eventId);
    publicKeys.push(em.publicKey);
  }

  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDTypeName,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds,
        productIds,
        publicKeys,
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
      value:
        eventIds.length !== 0 && eventIds.length <= 20 ? eventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: BigInt(watermark).toString(),
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: externalNullifier
        ? externalNullifier.toString()
        : BigInt(watermark).toString(),
      userProvided: false
    }
  };
  return constructZupassPcdGetRequestUrl<typeof ZKEdDSAEventTicketPCDPackage>(
    zupassUrl,
    returnUrl ?? "",
    ZKEdDSAEventTicketPCDTypeName,
    args,
    {
      genericProveScreen: true,
      title: proofTitle,
      description: proofDescription
    },
    true
  );
}
