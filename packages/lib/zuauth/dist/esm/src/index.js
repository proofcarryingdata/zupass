import { EdDSATicketPCDTypeName } from "@pcd/eddsa-ticket-pcd/EdDSATicketPCD";
import { constructZupassPcdGetRequestUrl } from "@pcd/passport-interface/PassportInterface";
import { zupassPopupExecute, zupassPopupSetup } from "@pcd/passport-interface/PassportPopup/core";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD";
import { ZKEdDSAEventTicketPCDTypeName } from "@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD";
// For convenience, re-export this here so that consumers don't need to install
// and import from `@pcd/passport-interface` directly.
export { zupassPopupSetup };
/**
 * Opens a popup window to the Zupass prove screen.
 */
export async function zuAuthPopup(args) {
    const proofUrl = constructZkTicketProofUrl(args);
    return zupassPopupExecute(args.returnUrl, proofUrl);
}
/**
 * Navigates to the Zupass prove screen.
 */
export function zuAuthRedirect(args) {
    const proofUrl = constructZkTicketProofUrl(args);
    window.location.href = proofUrl;
}
/**
 * Constructs a URL to the Zupass prove screen for a ZKEdDSAEventTicketPCD
 * zero-knowlege proof.
 */
export function constructZkTicketProofUrl(zuAuthArgs) {
    const { zupassUrl = "https://zupass.org", returnUrl, fieldsToReveal, watermark, eventTicketMetadata, externalNullifier, proofTitle = "ZKEdDSA Ticket Proof", proofDescription = "ZKEdDSA Ticket PCD Request" } = zuAuthArgs;
    const eventIds = [], productIds = [], publicKeys = [];
    for (const em of eventTicketMetadata) {
        for (const product of em.products) {
            eventIds.push(em.eventId);
            productIds.push(product.productId);
            publicKeys.push(em.publicKey);
        }
    }
    const args = {
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
            value: eventIds.length !== 0 && eventIds.length <= 20 ? eventIds : undefined,
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
    return constructZupassPcdGetRequestUrl(zupassUrl, returnUrl, ZKEdDSAEventTicketPCDTypeName, args, {
        genericProveScreen: true,
        title: proofTitle,
        description: proofDescription
    });
}
