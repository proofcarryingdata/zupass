import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { PipelineEventTicketMetadata } from "@pcd/passport-interface";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";

export async function authenticate(
  pcdStr: string,
  watermark: string,
  eventTicketMetadata: PipelineEventTicketMetadata[]
): Promise<ZKEdDSAEventTicketPCD> {
  const serializedPCD = JSON.parse(pcdStr);
  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(serializedPCD.pcd);

  if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
    throw new Error("ZK ticket PCD is not valid");
  }

  if (pcd.claim.watermark.toString() !== watermark) {
    throw new Error("PCD watermark doesn't match");
  }

  if (!pcd.claim.nullifierHash) {
    throw new Error("PCD ticket nullifer has not been defined");
  }

  const publicKeys = eventTicketMetadata.map((em) => em.publicKey);
  const productIds = new Set(
    eventTicketMetadata.flatMap((em) =>
      em.products.map((product) => product.productId)
    )
  );

  if (
    publicKeys.length > 0 &&
    !publicKeys.find((pubKey) =>
      isEqualEdDSAPublicKey(pubKey, pcd.claim.signer)
    )
  ) {
    throw new Error(
      "Signing key does not match any of the configured public keys"
    );
  }

  if (
    productIds.size > 0 &&
    pcd.claim.partialTicket.productId &&
    !productIds.has(pcd.claim.partialTicket.productId)
  ) {
    throw new Error(
      "Product ID does not match any of the configured product IDs"
    );
  }

  return pcd;
}
