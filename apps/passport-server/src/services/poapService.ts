import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { getHash } from "@pcd/passport-crypto";
import { SerializedPCD } from "@pcd/pcd-types";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import {
  claimPoapLink,
  getExistingClaimUrlByTicketId,
  getNewPoapUrl
} from "../database/queries/poap";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

const DEVCONNECT_COWORK_SPACE_EVENT_ID = "a1c822c4-60bd-11ee-8732-763dbf30819c";
const DEVCONNECT_COWORK_SPACE_VALID_PRODUCT_IDS = [
  "67687bda-986f-11ee-abf3-126a2f5f3c5c",
  "67689552-986f-11ee-abf3-126a2f5f3c5c",
  "6768a2e0-986f-11ee-abf3-126a2f5f3c5c",
  "6768af1a-986f-11ee-abf3-126a2f5f3c5c",
  "6768c81a-986f-11ee-abf3-126a2f5f3c5c",
  "6768d44a-986f-11ee-abf3-126a2f5f3c5c",
  "6768e21e-986f-11ee-abf3-126a2f5f3c5c",
  "6768ecf0-986f-11ee-abf3-126a2f5f3c5c",
  "6768f7cc-986f-11ee-abf3-126a2f5f3c5c",
  "67690410-986f-11ee-abf3-126a2f5f3c5c",
  "67690e92-986f-11ee-abf3-126a2f5f3c5c",
  "67691888-986f-11ee-abf3-126a2f5f3c5c",
  "67692468-986f-11ee-abf3-126a2f5f3c5c",
  "676932d2-986f-11ee-abf3-126a2f5f3c5c",
  "67694cfe-986f-11ee-abf3-126a2f5f3c5c",
  "676961d0-986f-11ee-abf3-126a2f5f3c5c"
];

export class PoapService {
  private readonly context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  private async validateDevconnectPCD(
    serializedPCD: string
  ): Promise<ZKEdDSAEventTicketPCD> {
    return traced("poap", "validateDevconnectPCD", async (span) => {
      const parsed = JSON.parse(serializedPCD) as SerializedPCD;
      if (parsed.type !== ZKEdDSAEventTicketPCDPackage.name) {
        throw new Error("[POAP] proof must be ZKEdDSAEventTicketPCD type");
      }

      const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(parsed.pcd);

      if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
        throw new Error(`Missing server eddsa private key .env value`);

      const TICKETING_PUBKEY = await getEdDSAPublicKey(
        process.env.SERVER_EDDSA_PRIVATE_KEY
      );

      const signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];

      span?.setAttribute("signerMatch", signerMatch);

      if (!signerMatch) {
        throw new Error("[POAP] signer of PCD is invalid");
      }

      if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
        throw new Error("[POAP] pcd invalid");
      }

      const {
        validEventIds,
        partialTicket: { productId, isConsumed }
      } = pcd.claim;

      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === DEVCONNECT_COWORK_SPACE_EVENT_ID
        )
      ) {
        throw new Error(
          "[POAP] valid event IDs of PCD does not match Devconnect Cowork space"
        );
      }

      if (!isConsumed) {
        throw new Error("[POAP] isConsumed field of PCD must be true");
      }

      if (
        !productId ||
        !DEVCONNECT_COWORK_SPACE_VALID_PRODUCT_IDS.includes(productId)
      ) {
        throw new Error("[POAP] product ID is invalid");
      }

      return pcd;
    });
  }

  public async getDevconnectPoapClaimUrl(
    serializedPCD: string
  ): Promise<string> {
    const pcd = await this.validateDevconnectPCD(serializedPCD);

    const { ticketId } = pcd.claim.partialTicket;
    if (ticketId == null) {
      throw new Error("[POAP] ticket ID must be revealed");
    }

    const hashedTicketId = await getHash(ticketId);
    const existingPoapLink = await getExistingClaimUrlByTicketId(
      this.context.dbPool,
      hashedTicketId
    );
    if (existingPoapLink != null) {
      return existingPoapLink;
    }

    const newPoapLink = await getNewPoapUrl(this.context.dbPool, "devconnect");
    if (newPoapLink == null) {
      throw new Error("[POAP] ran out of Devconnect links");
    }

    await claimPoapLink(this.context.dbPool, newPoapLink, hashedTicketId);

    return newPoapLink;
  }

  public async stop(): Promise<void> {}
}

export async function startPoapService(
  context: ApplicationContext
): Promise<PoapService | null> {
  logger(`[INIT] initializing POAP`);

  return new PoapService(context);
}
