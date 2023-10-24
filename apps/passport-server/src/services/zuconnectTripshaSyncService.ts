import { ZUCONNECT_PRODUCT_ID_MAPPINGS } from "@pcd/passport-interface";
import _ from "lodash";
import {
  IZuconnectTripshaAPI,
  ZuconnectTicket
} from "../apis/zuconnect/zuconnectTripshaAPI";
import { ZuconnectTicketDB } from "../database/models";
import { fetchAllZuconnectTickets } from "../database/queries/zuconnect/fetchZuconnectTickets";
import {
  softDeleteZuconnectTicket,
  upsertZuconnectTicket
} from "../database/queries/zuconnect/insertZuconnectTicket";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";
import { SemaphoreService } from "./semaphoreService";
import { setError, traced } from "./telemetryService";

const NAME = "Zuconnect Tripsha";

/**
 * Fetches ticket data from Tripsha's API and stores it in the database.
 */
export class ZuconnectTripshaSyncService {
  private zuconnectTripshaAPI: IZuconnectTripshaAPI;
  private rollbarService: RollbarService | null;
  private semaphoreService: SemaphoreService;
  private context: ApplicationContext;
  private timeout: NodeJS.Timeout | undefined;
  private static readonly SYNC_INTERVAL_MS = 1000 * 60;

  public constructor(
    context: ApplicationContext,
    api: IZuconnectTripshaAPI,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.context = context;
    this.zuconnectTripshaAPI = api;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
  }

  /**
   * Starts the sync service by conducting an initial sync and setting up
   * a timeout to repeat it at a set interval.
   */
  public async start(): Promise<void> {
    logger("[ZUCONNECT TRIPSHA] Starting sync loop");

    const trySync = async (): Promise<void> => {
      await this.trySync();
      this.timeout = setTimeout(
        () => trySync(),
        ZuconnectTripshaSyncService.SYNC_INTERVAL_MS
      );
    };

    trySync();
  }

  /**
   * Stop the sync service by cancelling the timeout.
   */
  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  /**
   * Run a sync job and report any errors that are thrown.
   */
  public async trySync(): Promise<void> {
    return traced(NAME, "trySync", async (span) => {
      try {
        logger("[ZUCONNECT TRIPSHA] Sync start");
        await this.sync();
        this.semaphoreService.scheduleReload();
        logger("[ZUCONNECT TRIPSHA] Sync finished");
      } catch (e) {
        this.rollbarService?.reportError(e);
        logger("[ZUCONNECT TRIPSHA] Sync failed", JSON.stringify(e, null, 2));
        setError(e, span);
      }
    });
  }

  /**
   * Fetch and save data from Tripsha. Thrown errors will be caught in trySync.
   */
  public async sync(): Promise<void> {
    return traced(NAME, "sync", async (_span) => {
      const tickets = await this.fetchData();
      await this.saveData(tickets);
    });
  }

  /**
   * Fetch tickets from the Tripsha API. Will throw errors if the network
   * fails or if invalid data is received.
   */
  private async fetchData(): Promise<ZuconnectTicket[]> {
    return this.zuconnectTripshaAPI.fetchTickets();
  }

  /**
   * Convert a Tripsha ticket type to a product ID.
   */
  private ticketTypeToProductId(type: ZuconnectTicket["ticketName"]): string {
    return ZUCONNECT_PRODUCT_ID_MAPPINGS[type].id;
  }

  private isMockTicketRecord(ticket: ZuconnectTicketDB): boolean {
    return ticket.is_mock_ticket;
  }

  private ticketsDifferent(
    existingTicket: ZuconnectTicketDB,
    newTicket: ZuconnectTicket
  ): boolean {
    return (
      existingTicket?.attendee_email !== newTicket.email ||
      existingTicket.attendee_name !== newTicket.fullName ||
      existingTicket.product_id !==
        ZUCONNECT_PRODUCT_ID_MAPPINGS[newTicket.ticketName]?.id ||
      !_.isEqual(existingTicket.extra_info, newTicket.extraInfo)
    );
  }

  /**
   * Save tickets to the database.
   */
  private async saveData(tickets: ZuconnectTicket[]): Promise<void> {
    return traced(NAME, "saveData", async (span) => {
      span?.setAttribute("ticket_count", tickets.length);

      const allTickets = await fetchAllZuconnectTickets(this.context.dbPool);
      // Tickets we just received from Tripsha only have an "external" ID, so
      // we should use this to check for existing tickets
      const existingTicketsByExternalId = new Map(
        allTickets.map((ticket) => [ticket.external_ticket_id, ticket])
      );
      // Which tickets are new or updated?
      const newOrUpdatedTickets = tickets.filter((ticket) => {
        // If we don't have it in the DB, it's new
        if (!existingTicketsByExternalId.has(ticket.id)) {
          return true;
        } else {
          // If we do have it but with different values, it's updated
          const existingTicket = existingTicketsByExternalId.get(
            ticket.id
          ) as ZuconnectTicketDB;
          if (this.ticketsDifferent(existingTicket, ticket)) {
            return true;
          }
        }
        // We already have this ticket
        return false;
      });

      const savedTickets = [];
      for (const ticket of newOrUpdatedTickets) {
        savedTickets.push(
          await upsertZuconnectTicket(this.context.dbPool, {
            external_ticket_id: ticket.id,
            product_id: this.ticketTypeToProductId(ticket.ticketName),
            attendee_email: ticket.email,
            attendee_name: ticket.fullName,
            is_deleted: false,
            is_mock_ticket: false,
            extra_info: ticket.extraInfo
          })
        );
      }

      // Compare the tickets in the database with the ones we just received
      // Here we are doing the comparison based on DB ID, not external ID
      const receivedTicketIds = new Set(
        [
          // Get the ID from the records generated during saving
          ...savedTickets.map((ticket) => ticket.id),
          // For existing tickets, use the map we created earlier to get the ID
          ...tickets.map(
            (ticket) => existingTicketsByExternalId.get(ticket.id)?.id ?? []
          )
        ].flat()
      );

      span?.setAttribute(
        "received_ticket_ids",
        [...receivedTicketIds.values()].join(", ")
      );

      const idsToDelete = allTickets
        .filter(
          (ticket) =>
            !receivedTicketIds.has(ticket.id) &&
            // Don't soft-delete mock tickets even though we didn't sync them
            !this.isMockTicketRecord(ticket)
        )
        .map((ticket) => ticket.id);

      // Anything in the DB that was not present in the sync we just ran, and
      // is not a mock ticket, should be soft-deleted.
      span?.setAttribute("ids_to_delete", idsToDelete.join(", "));
      for (const id of idsToDelete) {
        await softDeleteZuconnectTicket(this.context.dbPool, id);
      }

      logger(`[ZUCONNECT TRIPSHA] Received ${tickets.length} tickets`);
      logger(`[ZUCONNECT TRIPSHA] Saved ${savedTickets.length} tickets`);
      logger(`[ZUCONNECT TRIPSHA] Soft-deleted ${idsToDelete.length} tickets`);
    });
  }
}

/**
 * Starts the Zuconnect Tripsha sync service.
 * Before running, stores the Zuconnect ticket types in the database.
 */
export async function startZuconnectTripshaSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  api: IZuconnectTripshaAPI | null
): Promise<ZuconnectTripshaSyncService | null> {
  if (process.env.ZUCONNECT_MOCK_TICKETS) {
    try {
      const mockEmails: string[] = JSON.parse(
        process.env.ZUCONNECT_MOCK_TICKETS
      );
      for (const email of mockEmails) {
        logger(`[ZUCONNECT TRIPSHA] Inserting mock ticket for ${email}`);
        await upsertZuconnectTicket(context.dbPool, {
          external_ticket_id: `mock-${email}`,
          attendee_email: email,
          attendee_name: email,
          product_id:
            ZUCONNECT_PRODUCT_ID_MAPPINGS["ZuConnect Resident Pass"].id,
          is_deleted: false,
          is_mock_ticket: true,
          extra_info: []
        });
      }
    } catch (e) {
      logger("[ZUCONNECT TRIPSHA] Got invalid mock ticket emails", e);
    }
  }

  if (!api) {
    logger(
      "[ZUCONNECT TRIPSHA] Can't start sync service - no api instantiated"
    );
    return null;
  }

  const service = new ZuconnectTripshaSyncService(
    context,
    api,
    rollbarService,
    semaphoreService
  );

  service.start();

  return service;
}
