import { getEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { getHash } from "@pcd/passport-crypto";
import { SerializedPCD } from "@pcd/pcd-types";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { fetchDevconnectPretixTicketByTicketId } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  claimNewPoapUrl,
  getExistingClaimUrlByTicketId
} from "../database/queries/poap";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { getServerErrorUrl } from "../util/util";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

const DEVCONNECT_COWORK_SPACE_EVENT_ID = "a1c822c4-60bd-11ee-8732-763dbf30819c";

// All valid Cowork products that can claim a POAP. This excludes add-on products, like the Turkish Towel.
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
  private readonly rollbarService: RollbarService | null;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * Devconnect Cowork ticket that has been checked in, and returns
   * the ID of that ticket.
   */
  private async validateDevconnectTicket(
    serializedPCD: string
  ): Promise<string> {
    return traced("poap", "validateDevconnectPCD", async (span) => {
      const parsed = JSON.parse(serializedPCD) as SerializedPCD;
      if (parsed.type !== ZKEdDSAEventTicketPCDPackage.name) {
        throw new Error("proof must be ZKEdDSAEventTicketPCD type");
      }

      const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(parsed.pcd);

      if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
        throw new Error(`missing server eddsa private key .env value`);

      const TICKETING_PUBKEY = await getEdDSAPublicKey(
        process.env.SERVER_EDDSA_PRIVATE_KEY
      );

      const signerMatch =
        pcd.claim.signer[0] === TICKETING_PUBKEY[0] &&
        pcd.claim.signer[1] === TICKETING_PUBKEY[1];

      span?.setAttribute("signerMatch", signerMatch);

      if (!signerMatch) {
        throw new Error("signer of PCD is invalid");
      }

      if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
        throw new Error("pcd invalid");
      }

      const {
        validEventIds,
        partialTicket: { ticketId }
      } = pcd.claim;

      if (ticketId == null) {
        throw new Error("ticket ID must be revealed");
      }
      const devconnectPretixTicket =
        await fetchDevconnectPretixTicketByTicketId(
          this.context.dbPool,
          ticketId
        );
      if (devconnectPretixTicket == null) {
        throw new Error("ticket ID does not exist");
      }
      const { devconnect_pretix_items_info_id, is_consumed } =
        devconnectPretixTicket;

      span?.setAttribute("ticketId", ticketId);

      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === DEVCONNECT_COWORK_SPACE_EVENT_ID
        )
      ) {
        throw new Error(
          "valid event IDs of PCD does not match Devconnect Cowork space"
        );
      }

      span?.setAttribute("isConsumed", is_consumed);

      if (!is_consumed) {
        throw new Error("ticket was not checked in at Devconnect");
      }

      span?.setAttribute("productId", devconnect_pretix_items_info_id);

      if (
        !DEVCONNECT_COWORK_SPACE_VALID_PRODUCT_IDS.includes(
          devconnect_pretix_items_info_id
        )
      ) {
        throw new Error("product ID is invalid");
      }

      return ticketId;
    });
  }

  public async getDevconnectPoapClaimUrl(
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateDevconnectTicket(serializedPCD);

      // We have already checked that `ticketId` is defined in validateDevconnectPCD
      const hashedTicketId = await getHash(ticketId);
      const existingPoapLink = await getExistingClaimUrlByTicketId(
        this.context.dbPool,
        hashedTicketId
      );
      if (existingPoapLink != null) {
        return existingPoapLink;
      }

      const newPoapLink = await claimNewPoapUrl(
        this.context.dbPool,
        "devconnect",
        hashedTicketId
      );
      if (newPoapLink == null) {
        throw new Error("Not enough Devconnect POAP links");
      }

      return newPoapLink;
    } catch (e) {
      logger("[POAP] getDevconnectPoapClaimUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        "An error occurred while fetching your POAP mint link for Devconnect 2023."
      );
    }
  }
}

export async function startPoapService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<PoapService | null> {
  logger(`[INIT] initializing POAP`);

  return new PoapService(context, rollbarService);
}
