import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { PipelineEdDSATicketZuAuthConfig } from "@pcd/passport-interface";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage,
  ZKEdDSAEventTicketPCDTypeName
} from "@pcd/zk-eddsa-event-ticket-pcd";

/**
 * Authenticates a ticket PCD.
 *
 * Receives a JSON-encoded serialized PCD string, where the PCD must be a
 * ZKEdDSAEventTicketPCD. This is deserialized and verified, throwing an
 * exception if either fails.
 *
 * The watermark in the PCD is compared against the value provided, and an
 * exception is thrown if they do not match.
 *
 * Finally, the PCD is compared against the metadata provided
 */
export async function authenticate(
  pcdStr: string,
  watermark: string,
  config: PipelineEdDSATicketZuAuthConfig[]
): Promise<ZKEdDSAEventTicketPCD> {
  const serializedPCD = JSON.parse(pcdStr);
  if (serializedPCD.type !== ZKEdDSAEventTicketPCDTypeName) {
    throw new Error("PCD is malformed or of the incorrect type");
  }

  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(serializedPCD.pcd);

  if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
    throw new Error("ZK ticket PCD is not valid");
  }

  if (pcd.claim.watermark.toString() !== watermark) {
    throw new Error("PCD watermark doesn't match");
  }

  const publicKeys = config.map((em) => em.publicKey);
  const productIds = new Set(
    // Product ID is optional, so it's important to filter out undefined values
    config
      .map((em) => em.productId)
      .filter((productId) => productId !== undefined)
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
