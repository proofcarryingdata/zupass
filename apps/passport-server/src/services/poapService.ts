import {
  EdDSAPublicKey,
  getEdDSAPublicKey,
  isEqualEdDSAPublicKey
} from "@pcd/eddsa-pcd";
import { getHash } from "@pcd/passport-crypto";
import {
  EDGE_CITY_7_DAY_PRODUCT_IDS,
  EDGE_CITY_EVENT_ID,
  ETH_LATAM_2024_EVENT_ID,
  VITALIA_EVENT_ID,
  VITALIA_PUBLIC_KEY,
  ZUCONNECT_23_DAY_PASS_EVENT_ID,
  ZUCONNECT_23_FIRST_WEEK_EVENT_ID,
  ZUCONNECT_23_ORGANIZER_EVENT_ID,
  ZUCONNECT_23_RESIDENT_EVENT_ID,
  ZUCONNECT_23_SCHOLARSHIP_EVENT_ID,
  ZUZALU_23_EVENT_ID
} from "@pcd/passport-interface";
import { SerializedPCD } from "@pcd/pcd-types";
import { RollbarService } from "@pcd/server-shared";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import AsyncLock from "async-lock";
import { isEqual } from "lodash";
import { PoolClient } from "postgres-pool";
import { PoapEvent } from "../database/models";
import { fetchDevconnectPretixTicketByTicketId } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  claimNewPoapUrl,
  getExistingClaimUrlByTicketId
} from "../database/queries/poap";
import { fetchZuconnectTicketById } from "../database/queries/zuconnect/fetchZuconnectTickets";
import { fetchAllUsersWithZuzaluTickets } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { getServerErrorUrl } from "../util/util";
import { traced } from "./telemetryService";

// Set up an async-lock to prevent race conditions when two separate invocations
// of `getDevconnectPoapClaimUrl()` with the same `ticketId` end up claiming separete
// POAP links.
const lock = new AsyncLock();

const DEVCONNECT_COWORK_SPACE_EVENT_ID = "a1c822c4-60bd-11ee-8732-763dbf30819c";

const ZUCONNECT_EVENT_IDS = new Set([
  ZUCONNECT_23_RESIDENT_EVENT_ID,
  ZUCONNECT_23_FIRST_WEEK_EVENT_ID,
  ZUCONNECT_23_SCHOLARSHIP_EVENT_ID,
  ZUCONNECT_23_ORGANIZER_EVENT_ID,
  ZUCONNECT_23_DAY_PASS_EVENT_ID
]);

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

/**
 * Responsible for issuing POAP (poap.xyz) mint links to users
 * who have attended a certain event, e.g. Devconnect.
 */
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
   * This helper function checks that a serialized PCD satisfies
   * the following properties:
   *   1. The type of the PCD is ZKEdDSAEventTicketPCD
   *   2. The signer of the PCD's claim matches this server's EdDSA public key
   *   3. The proof of the PCD is valid when checked by the verify() function
   * If the serialized PCD satisfies these three properties, the deserialized
   * ZKEdDSAEventTicketPCD is returned.
   */
  private async validateZKEdDSAEventTicketPCD(
    serializedPCD: string,
    signerPublicKey?: EdDSAPublicKey
  ): Promise<ZKEdDSAEventTicketPCD> {
    logger(
      "[POAP] checking that PCD type is ZKEdDSAEventTicketPCD",
      serializedPCD
    );
    const parsed = JSON.parse(serializedPCD) as SerializedPCD;
    if (parsed.type !== ZKEdDSAEventTicketPCDPackage.name) {
      throw new Error("proof must be ZKEdDSAEventTicketPCD type");
    }

    const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(parsed.pcd);

    logger(
      `[POAP] checking that signer of ticket ${pcd.claim.partialTicket.ticketId} matches intended signer`
    );

    if (!signerPublicKey) {
      if (!process.env.SERVER_EDDSA_PRIVATE_KEY)
        throw new Error(`missing server eddsa private key .env value`);

      signerPublicKey = await getEdDSAPublicKey(
        process.env.SERVER_EDDSA_PRIVATE_KEY
      );
    }

    const signerMatch = isEqualEdDSAPublicKey(
      pcd.claim.signer,
      signerPublicKey
    );

    if (!signerMatch) {
      throw new Error("signer of PCD is invalid");
    }

    logger("[POAP] verifying PCD proof and claim", pcd);
    if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
      throw new Error("pcd invalid");
    }

    return pcd;
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * Zuzalu 2023 ticket and returns the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Event of ticket is not Zuzalu 2023
   *  5. Ticket does not actually exist
   */
  private async validateZuzalu23Ticket(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    return traced("poap", "validateZuzalu23Ticket", async (span) => {
      const pcd = await this.validateZKEdDSAEventTicketPCD(serializedPCD);

      const {
        validEventIds,
        partialTicket: { ticketId }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventds ${validEventIds} matches Zuzalu 2023`
      );
      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === ZUZALU_23_EVENT_ID
        )
      ) {
        throw new Error("valid event IDs of PCD does not match Zuzalu 2023");
      }

      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      span?.setAttribute("ticketId", ticketId);

      logger(`[POAP] fetching zuzalu ticket ${ticketId} from database`);

      // A bit of a hack given our implementation details - we know that the ticketId for
      // a Zuzalu EdDSATicketPCD is always set to the user's uuid during issuance, which happens
      // in the function {@link issueZuzaluTicketPCDs} within issuanceService.ts.
      const allZuzaluUsers = await fetchAllUsersWithZuzaluTickets(client);
      const matchingTicket = allZuzaluUsers.find((u) => u.uuid === ticketId);
      if (matchingTicket === null) {
        throw new Error("zuzalu ticket does not exist");
      }
      return ticketId;
    });
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * ZuConnect 2023 ticket and returns the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Event of ticket is not ZuConnect 2023
   *  5. Ticket does not actually exist
   */
  private async validateZuConnectTicket(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    return traced("poap", "validateZuConnectTicket", async (span) => {
      const pcd = await this.validateZKEdDSAEventTicketPCD(serializedPCD);

      const {
        validEventIds,
        partialTicket: { ticketId }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventds ${validEventIds} matches ZuConnect 2023`
      );
      if (
        !(validEventIds && isEqual(ZUCONNECT_EVENT_IDS, new Set(validEventIds)))
      ) {
        throw new Error(
          "valid event IDs of PCD does not match ZuConnect event IDs"
        );
      }

      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      span?.setAttribute("ticketId", ticketId);

      logger(`[POAP] fetching zuconnect ticket ${ticketId} from database`);

      const zuconnectTicket = await fetchZuconnectTicketById(client, ticketId);

      if (!zuconnectTicket) {
        throw new Error("zuconnect ticket does not exist");
      }

      return ticketId;
    });
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * Vitalia 2024 ticket and returns the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Event of ticket is not Vitalia 2024
   */
  private async validateVitaliaTicket(serializedPCD: string): Promise<string> {
    return traced("poap", "validateVitaliaTicket", async (span) => {
      const pcd = await this.validateZKEdDSAEventTicketPCD(
        serializedPCD,
        VITALIA_PUBLIC_KEY
      );

      const {
        validEventIds,
        partialTicket: { ticketId }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventds ${validEventIds} matches Vitalia 2024`
      );

      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === VITALIA_EVENT_ID
        )
      ) {
        throw new Error("valid event IDs of PCD does not match Vitalia 2024");
      }

      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      span?.setAttribute("ticketId", ticketId);

      return ticketId;
    });
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * Edge City Denver 7-day ticket and returns the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Event of ticket is not Edge City Denver
   *  5. Type of ticket is not 7-day pass
   */
  private async validateEdgeCityDenverTicket(
    serializedPCD: string
  ): Promise<string> {
    return traced("poap", "validateEdgeCityDenverTicket", async (span) => {
      if (!process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY)
        throw new Error(
          "Missing generic issuance eddsa private key .env value"
        );
      const pcd = await this.validateZKEdDSAEventTicketPCD(
        serializedPCD,
        await getEdDSAPublicKey(process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY)
      );

      const {
        validEventIds,
        partialTicket: { ticketId, productId }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventds ${validEventIds} matches Edge City Denver`
      );

      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === EDGE_CITY_EVENT_ID
        )
      ) {
        throw new Error(
          "valid event IDs of PCD does not match Edge City Denver"
        );
      }

      if (!(productId && EDGE_CITY_7_DAY_PRODUCT_IDS.includes(productId))) {
        throw new Error(
          "product ID of PCD does not match Edge City Denver 7-day Pass"
        );
      }

      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      span?.setAttribute("ticketId", ticketId);

      return ticketId;
    });
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * ETH LATAM 2024 ticket and returns the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Event of ticket is not ETH LATAM 2024
   *  5. Ticket was not checked in
   */
  private async validateETHLatamTicket(serializedPCD: string): Promise<string> {
    return traced("poap", "validateETHLatamDenverTicket", async (span) => {
      if (!process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY)
        throw new Error(
          "Missing generic issuance eddsa private key .env value"
        );
      const pcd = await this.validateZKEdDSAEventTicketPCD(
        serializedPCD,
        await getEdDSAPublicKey(process.env.GENERIC_ISSUANCE_EDDSA_PRIVATE_KEY)
      );

      const {
        validEventIds,
        partialTicket: { ticketId, isConsumed }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventIds ${validEventIds} matches ETH LATAM 2024`
      );

      if (
        !(
          validEventIds &&
          validEventIds.length === 1 &&
          validEventIds[0] === ETH_LATAM_2024_EVENT_ID
        )
      ) {
        throw new Error("valid event IDs of PCD does not match ETH LATAM 2024");
      }

      if (!isConsumed) {
        throw new Error("ticket was not checked in at ETH LATAM 2024");
      }

      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      span?.setAttribute("ticketId", ticketId);

      return ticketId;
    });
  }

  /**
   * Validates that a serialized ZKEdDSAEventTicketPCD is a valid
   * Devconnect Cowork ticket that has been checked in, and returns
   * the ID of that ticket.
   *
   * This function throws an error in the case that the PCD is not
   * valid; for example, here are a few invalid cases
   *  1. Wrong PCD type
   *  2. Wrong EdDSA public key
   *  3. PCD proof is invalid
   *  4. Ticket does not exist
   *  5. Ticket has not been checked in
   *  6. Event of ticket is not Cowork space
   *  7. Invalid product for claiming a poap, e.g. EF Towel
   */
  private async validateDevconnectTicket(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    return traced("poap", "validateDevconnectTicket", async (span) => {
      const pcd = await this.validateZKEdDSAEventTicketPCD(serializedPCD);

      const {
        validEventIds,
        partialTicket: { ticketId }
      } = pcd.claim;

      logger(
        `[POAP] checking that validEventds ${validEventIds} matches cowork space`
      );
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

      logger(`[POAP] fetching devconnect ticket ${ticketId} from database`);
      if (!ticketId) {
        throw new Error("ticket ID must be revealed");
      }
      const devconnectPretixTicket =
        await fetchDevconnectPretixTicketByTicketId(client, ticketId);
      if (!devconnectPretixTicket) {
        throw new Error("ticket ID does not exist");
      }
      const { devconnect_pretix_items_info_id, is_consumed, email } =
        devconnectPretixTicket;

      span?.setAttribute("ticketId", ticketId);
      span?.setAttribute("email", email);
      span?.setAttribute("isConsumed", is_consumed);

      logger(
        `[POAP] checking that devconnect ticket ${ticketId} has been consumed`
      );

      if (!is_consumed) {
        throw new Error("ticket was not checked in at Devconnect");
      }

      span?.setAttribute("productId", devconnect_pretix_items_info_id);

      logger(
        `[POAP] checking that devconnect ticket ${ticketId} has a valid product id`
      );
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

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming a Devconnect POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getDevconnectPoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateDevconnectTicket(
        client,
        serializedPCD
      );
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "devconnect"
      );
      if (poapLink === null) {
        throw new Error("Not enough Devconnect POAP links");
      }
      return poapLink;
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

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming a Zuzalu 2023 POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getZuzalu23PoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateZuzalu23Ticket(client, serializedPCD);
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "zuzalu23"
      );
      if (poapLink === null) {
        throw new Error("Not enough Zuzalu 2023 POAP links");
      }
      return poapLink;
    } catch (e) {
      logger("[POAP] getZuzalu23PoapRedirectUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        "An error occurred while fetching your POAP mint link for Zuzalu 2023."
      );
    }
  }

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming a ZuConnect 2023 POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getZuConnectPoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateZuConnectTicket(
        client,
        serializedPCD
      );
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "zuconnect"
      );
      if (poapLink === null) {
        throw new Error("Not enough ZuConnect POAP links");
      }
      return poapLink;
    } catch (e) {
      logger("[POAP] getZuConnectPoapRedirectUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        "An error occurred while fetching your POAP mint link for ZuConnect."
      );
    }
  }

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming an Edge City Denver POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getEdgeCityDenverPoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateEdgeCityDenverTicket(serializedPCD);
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "edgecitydenver"
      );
      if (poapLink === null) {
        throw new Error("Not enough Edge City Denver POAP links");
      }
      return poapLink;
    } catch (e) {
      logger("[POAP] getEdgeCityDenverPoapRedirectUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        "An error occurred while fetching your POAP mint link for Edge City Denver."
      );
    }
  }

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming an ETH LATAM 2024 POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getETHLatamPoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateETHLatamTicket(serializedPCD);
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "ethlatam"
      );
      if (poapLink === null) {
        throw new Error("Not enough ETH LATAM POAP links");
      }
      return poapLink;
    } catch (e) {
      logger("[POAP] getETHLatamPoapRedirectUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        `An error occurred while fetching your POAP mint link for ETH LATAM: ${e}`
      );
    }
  }

  /**
   * Given a ZKEdDSAEventTicketPCD sent to the server for claiming a Vitalia 2024 POAP,
   * returns the valid redirect URL to the response handler.
   *  1. If this ticket is already associated with a POAP mint link, return that link.
   *  2. If this ticket is not associated with a POAP mint link and more unclaimed POAP
   *     links exist, then associate that unclaimed link with this ticket and return it.
   *  3. If this ticket is not associated with a POAP mint link and no more unclaimed
   *     POAP links exist, return a custom server error URL.
   */
  public async getVitaliaPoapRedirectUrl(
    client: PoolClient,
    serializedPCD: string
  ): Promise<string> {
    try {
      const ticketId = await this.validateVitaliaTicket(serializedPCD);
      const poapLink = await this.getPoapClaimUrlByTicketId(
        client,
        ticketId,
        "vitalia"
      );
      if (poapLink === null) {
        throw new Error("Not enough Vitalia POAP links");
      }
      return poapLink;
    } catch (e) {
      logger("[POAP] getVitaliaPoapRedirectUrl error", e);
      this.rollbarService?.reportError(e);
      // Return the generic /server-error page instead for the route to redirect to,
      // with a title and description informing the user to contact support.
      return getServerErrorUrl(
        "Contact support",
        "An error occurred while fetching your POAP mint link for Vitalia."
      );
    }
  }

  /**
   * Helper function to handle the logic of retrieving the correct POAP mint link
   * given the ticket ID.
   *  1. If this ticket ID is already associated with a POAP mint link,
   *     return that link.
   *  2. If this ticket ID is not yet associated with a POAP mint link,
   *     a new POAP mint link with the given poapEvent is associated with
   *     the ticket ID, and that link is returned.
   *  3. If this ticket ID is not associated with a POAP mint link and
   *     no more unclaimed POAP mint links exist, return NULL.
   */
  public async getPoapClaimUrlByTicketId(
    client: PoolClient,
    ticketId: string,
    poapEvent: PoapEvent
  ): Promise<string | null> {
    return traced("poap", "getPoapClaimUrlByTicketId", async (span) => {
      span?.setAttribute("ticketId", ticketId);
      span?.setAttribute("poapEvent", poapEvent);
      const hashedTicketId = await getHash(ticketId);
      span?.setAttribute("hashedTicketId", hashedTicketId);
      // This critical section executes within a lock to prevent the case where two
      // separate invocations both end up on the `claimNewPoapUrl()` function.
      const poapLink = await lock.acquire(
        `${ticketId}-${poapEvent}`,
        async () => {
          const existingPoapLink = await getExistingClaimUrlByTicketId(
            client,
            hashedTicketId
          );
          if (existingPoapLink !== null) {
            span?.setAttribute("alreadyClaimed", true);
            span?.setAttribute("poapLink", existingPoapLink);
            return existingPoapLink;
          }

          const newPoapLink = await claimNewPoapUrl(
            client,
            poapEvent,
            hashedTicketId
          );

          span?.setAttribute("alreadyClaimed", false);
          if (newPoapLink) {
            span?.setAttribute("poapLink", newPoapLink);
          }

          return newPoapLink;
        }
      );

      return poapLink;
    });
  }
}

export function startPoapService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): PoapService {
  logger(`[INIT] initializing POAP`);

  return new PoapService(context, rollbarService);
}
