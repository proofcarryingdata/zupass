"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const eddsa_pcd_1 = require("@pcd/eddsa-pcd");
const zk_eddsa_event_ticket_pcd_1 = require("@pcd/zk-eddsa-event-ticket-pcd");
async function authenticate(pcdStr, watermark, eventTicketMetadata) {
    const serializedPCD = JSON.parse(pcdStr);
    const pcd = await zk_eddsa_event_ticket_pcd_1.ZKEdDSAEventTicketPCDPackage.deserialize(serializedPCD.pcd);
    if (!(await zk_eddsa_event_ticket_pcd_1.ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
        throw new Error("ZK ticket PCD is not valid");
    }
    if (pcd.claim.watermark.toString() !== watermark) {
        throw new Error("PCD watermark doesn't match");
    }
    if (!pcd.claim.nullifierHash) {
        throw new Error("PCD ticket nullifer has not been defined");
    }
    const publicKeys = eventTicketMetadata.map((em) => em.publicKey);
    const productIds = new Set(eventTicketMetadata.flatMap((em) => em.products.map((product) => product.productId)));
    if (publicKeys.length > 0 &&
        !publicKeys.find((pubKey) => (0, eddsa_pcd_1.isEqualEdDSAPublicKey)(pubKey, pcd.claim.signer))) {
        throw new Error("Signing key does not match any of the configured public keys");
    }
    if (productIds.size > 0 &&
        pcd.claim.partialTicket.productId &&
        !productIds.has(pcd.claim.partialTicket.productId)) {
        throw new Error("Product ID does not match any of the configured product IDs");
    }
}
exports.authenticate = authenticate;
