"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructZkTicketProofUrl = exports.zuAuthRedirect = exports.zuAuthPopup = exports.zupassPopupSetup = void 0;
const EdDSATicketPCD_1 = require("@pcd/eddsa-ticket-pcd/EdDSATicketPCD");
const PassportInterface_1 = require("@pcd/passport-interface/PassportInterface");
const core_1 = require("@pcd/passport-interface/PassportPopup/core");
Object.defineProperty(exports, "zupassPopupSetup", { enumerable: true, get: function () { return core_1.zupassPopupSetup; } });
const pcd_types_1 = require("@pcd/pcd-types");
const SemaphoreIdentityPCD_1 = require("@pcd/semaphore-identity-pcd/SemaphoreIdentityPCD");
const ZKEdDSAEventTicketPCD_1 = require("@pcd/zk-eddsa-event-ticket-pcd/ZKEdDSAEventTicketPCD");
/**
 * Opens a popup window to the Zupass prove screen.
 */
async function zuAuthPopup(args) {
    const proofUrl = constructZkTicketProofUrl(args);
    return (0, core_1.zupassPopupExecute)(args.returnUrl, proofUrl);
}
exports.zuAuthPopup = zuAuthPopup;
/**
 * Navigates to the Zupass prove screen.
 */
function zuAuthRedirect(args) {
    const proofUrl = constructZkTicketProofUrl(args);
    window.location.href = proofUrl;
}
exports.zuAuthRedirect = zuAuthRedirect;
/**
 * Constructs a URL to the Zupass prove screen for a ZKEdDSAEventTicketPCD
 * zero-knowlege proof.
 */
function constructZkTicketProofUrl(zuAuthArgs) {
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
            argumentType: pcd_types_1.ArgumentTypeName.PCD,
            pcdType: EdDSATicketPCD_1.EdDSATicketPCDTypeName,
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
            argumentType: pcd_types_1.ArgumentTypeName.PCD,
            pcdType: SemaphoreIdentityPCD_1.SemaphoreIdentityPCDTypeName,
            value: undefined,
            userProvided: true
        },
        validEventIds: {
            argumentType: pcd_types_1.ArgumentTypeName.StringArray,
            value: eventIds.length !== 0 && eventIds.length <= 20 ? eventIds : undefined,
            userProvided: false
        },
        fieldsToReveal: {
            argumentType: pcd_types_1.ArgumentTypeName.ToggleList,
            value: fieldsToReveal,
            userProvided: false
        },
        watermark: {
            argumentType: pcd_types_1.ArgumentTypeName.BigInt,
            value: watermark.toString(),
            userProvided: false
        },
        externalNullifier: {
            argumentType: pcd_types_1.ArgumentTypeName.BigInt,
            value: externalNullifier
                ? externalNullifier.toString()
                : watermark.toString(),
            userProvided: false
        }
    };
    return (0, PassportInterface_1.constructZupassPcdGetRequestUrl)(zupassUrl, returnUrl, ZKEdDSAEventTicketPCD_1.ZKEdDSAEventTicketPCDTypeName, args, {
        genericProveScreen: true,
        title: proofTitle,
        description: proofDescription
    });
}
exports.constructZkTicketProofUrl = constructZkTicketProofUrl;
