import { Pool } from "postgres-pool";
import {
  DevconnectPretixEvent,
  DevconnectPretixEventSettings,
  DevconnectPretixItem,
  DevconnectPretixOrder,
  IDevconnectPretixAPI,
  getI18nString
} from "../../apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixEventConfig,
  DevconnectPretixOrganizerConfig
} from "../../apis/devconnect/organizer";
import {
  DevconnectPretixTicket,
  DevconnectPretixTicketDB,
  PretixItemInfo
} from "../../database/models";
import { fetchDevconnectPretixTicketsByEvent } from "../../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../../database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { softDeleteDevconnectPretixTicket } from "../../database/queries/devconnect_pretix_tickets/softDeleteDevconnectPretixTicket";
import { updateDevconnectPretixTicket } from "../../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import {
  fetchPretixEventInfo,
  insertPretixEventsInfo,
  updatePretixEventsInfo
} from "../../database/queries/pretixEventInfo";
import {
  fetchPretixItemsInfoByEvent,
  insertPretixItemsInfo,
  softDeletePretixItemInfo,
  updatePretixItemsInfo
} from "../../database/queries/pretixItemInfo";
import { pretixTicketsDifferent } from "../../util/devconnectTicket";
import { logger } from "../../util/logger";
import { RollbarService } from "../rollbarService";
import { setError, traced } from "../telemetryService";

const NAME = "OrganizerSync";

// Collection of API data for a single event
interface EventData {
  settings: DevconnectPretixEventSettings;
  eventInfo: DevconnectPretixEvent;
  items: DevconnectPretixItem[];
  tickets: DevconnectPretixOrder[];
}

interface EventDataFromPretix {
  data: EventData;
  event: DevconnectPretixEventConfig;
}

type SyncPhase = "fetching" | "validating" | "saving";

export interface SyncErrorCause {
  phase: SyncPhase;
  error: Error;
  organizerId: string;
}

function errorCause(
  phase: SyncPhase,
  organizerId: string,
  originalError: any
): SyncErrorCause {
  if (originalError instanceof Error) {
    return { phase, error: originalError, organizerId };
  } else {
    throw new Error(`originalError is not an error`);
  }
}

/**
 * For the purposes of sync, organizers are isolated from each other.
 * A failure for one organizer should not prevent other organizers from
 * completing sync.
 */
export class OrganizerSync {
  private organizer: DevconnectPretixOrganizerConfig;
  private pretixAPI: IDevconnectPretixAPI;
  private rollbarService: RollbarService | null;
  private db: Pool;
  private _isRunning: boolean;

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public constructor(
    organizer: DevconnectPretixOrganizerConfig,
    pretixAPI: IDevconnectPretixAPI,
    rollbarService: RollbarService | null,
    db: Pool
  ) {
    this.organizer = organizer;
    this.pretixAPI = pretixAPI;
    this.rollbarService = rollbarService;
    this.db = db;
    this._isRunning = false;
  }

  // Conduct a single sync run
  public async run(): Promise<void> {
    let fetchedData;
    this._isRunning = true;

    try {
      try {
        fetchedData = await this.fetchData();
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX]: Encountered error when fetching data for ${this.organizer.id}: ${e}`
        );
        this.rollbarService?.reportError(e);

        throw new Error("Data failed to fetch", {
          cause: errorCause("fetching", this.organizer.id, e)
        });
      }

      try {
        this.validate(fetchedData);
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX]: Encountered error when validating fetched data for ${this.organizer.id}: ${e}`
        );
        this.rollbarService?.reportError(e);

        throw new Error("Data failed to validate", {
          cause: errorCause("validating", this.organizer.id, e)
        });
      }

      try {
        await this.save(fetchedData);
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX]: Encountered error when saving data for ${this.organizer.id}: ${e}`
        );
        this.rollbarService?.reportError(e);

        throw new Error("Data failed to save", {
          cause: errorCause("saving", this.organizer.id, e)
        });
      }
    } finally {
      this._isRunning = false;
    }
  }

  public cancel(): void {
    this.pretixAPI.cancelPendingRequests();
  }

  /**
   * Fetch data for each of the organizer's events.
   */
  private async fetchData(): Promise<EventDataFromPretix[]> {
    return traced(NAME, "fetchData", async (span) => {
      span?.setAttribute("org_url", this.organizer.orgURL);

      const fetchedData = [];
      for (const event of this.organizer.events) {
        fetchedData.push({
          event,
          data: await this.fetchEventData(this.organizer, event)
        });
      }

      return fetchedData;
    });
  }

  /**
   * Validate that an event's settings match our expectations.
   * These settings correspond to the "Ask for email addresses per ticket"
   * setting in the Pretix UI being set to "Ask and require input", which
   * is mandatory for us.
   */
  private validateEventSettings(
    settings: DevconnectPretixEventSettings
  ): string[] {
    const errors = [];
    if (
      settings.attendee_emails_asked !== true ||
      settings.attendee_emails_required !== true
    ) {
      errors.push(
        `"Ask for email addresses per ticket" setting should be set to "Ask and require input"`
      );
    }

    return errors;
  }

  /**
   * Validate that an item/products settings match our expectations.
   * These settings correspond to the product being of type "Admission",
   * "Personalization" being set to "Personalized ticket", and
   * "Generate tickets" in the "Tickets & Badges" section being set to
   * "Choose automatically depending on event settings" in the Pretix UI.
   */
  private validateEventItem(item: DevconnectPretixItem): string[] {
    const errors = [];
    if (item.admission !== true) {
      errors.push(`Product type is not "Admission"`);
    }

    if (item.personalized !== true) {
      errors.push(`"Personalization" is not set to "Personalized ticket"`);
    }

    if (
      !(
        item.generate_tickets === null || item.generate_tickets === undefined
      ) &&
      item.generate_tickets !== false
    ) {
      errors.push(
        `"Generate tickets" is not set to "Choose automatically depending on event settings" or "Never"`
      );
    }

    return errors;
  }

  /**
   * Check all of the API responses for an event before syncing them to the
   * DB.
   */
  private validateEventData(
    eventData: EventData,
    eventConfig: DevconnectPretixEventConfig
  ): string[] {
    const { settings, items } = eventData;
    const activeItemIdSet = new Set(eventConfig.activeItemIDs);
    const superuserItemIdSet = new Set(eventConfig.superuserItemIds);

    // We want to make sure that we log all errors, so we collect everything
    // and only throw an exception once we have found all of them.
    const errors: string[] = [];

    const eventSettingErrors = this.validateEventSettings(settings);
    if (eventSettingErrors.length > 0) {
      errors.push(
        `Event settings for "${eventData.eventInfo.name.en}" (${eventData.eventInfo.slug}) are invalid:\n` +
          eventSettingErrors.join("\n")
      );
    }

    const fetchedItemsIdSet = new Set();

    for (const item of items) {
      // Ignore items which are not in the event's "activeItemIDs" set
      if (activeItemIdSet.has(item.id.toString())) {
        fetchedItemsIdSet.add(item.id.toString());
        const itemErrors = this.validateEventItem(item);
        if (itemErrors.length > 0) {
          errors.push(
            `Product "${item.name.en}" (${item.id}) in event "${eventData.eventInfo.name.en}" is invalid:\n` +
              itemErrors.join("\n")
          );
        }
      }
    }

    const activeItemDiff = [...activeItemIdSet].filter(
      (x) => !fetchedItemsIdSet.has(x)
    );

    const superuserItemDiff = [...superuserItemIdSet].filter(
      (x) => !fetchedItemsIdSet.has(x)
    );

    if (activeItemDiff.length > 0) {
      errors.push(
        `Active items with ID(s) "${activeItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.eventID
        }`
      );
    }

    if (superuserItemDiff.length > 0) {
      errors.push(
        `Superuser items with ID(s) "${superuserItemDiff.join(
          ", "
        )}" are present in config but not in data fetched from Pretix for event ${
          eventConfig.eventID
        }`
      );
    }

    return errors;
  }

  /**
   * Validate fetched data, or throw an exception
   */
  private validate(fetchedData: EventDataFromPretix[]): void {
    const errors = [];

    for (const { data, event } of fetchedData) {
      errors.push(...this.validateEventData(data, event));
    }

    if (errors.length > 0) {
      for (const error of errors) {
        logger(
          `[DEVCONNECT PRETIX]: Encountered error when validating fetched data for ${this.organizer.id}: ${error}`
        );
      }
      throw new Error(errors.join("\n"), { cause: errors });
    }
  }

  /**
   * Fetch all of the API responses from Pretix necessary to sync an event,
   * so that we can inspect them before beginning a sync.
   */
  private async fetchEventData(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig
  ): Promise<EventData> {
    return traced(NAME, "fetchEventData", async () => {
      const { orgURL, token } = organizer;
      const { eventID } = event;

      const settings = await this.pretixAPI.fetchEventSettings(
        orgURL,
        token,
        eventID
      );

      const items = await this.pretixAPI.fetchItems(orgURL, token, eventID);

      const eventInfo = await this.pretixAPI.fetchEvent(orgURL, token, eventID);

      const tickets = await this.pretixAPI.fetchOrders(orgURL, token, eventID);

      return { settings, items, eventInfo, tickets };
    });
  }

  /**
   * Sync a single event.
   * This coordinates the syncing of event info, items, and tickets to the DB.
   * No actual fetching from Pretix happens here, as the data was already
   * fetched when checking for validity.
   */
  private async saveEvent(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig,
    eventData: EventData
  ): Promise<void> {
    return traced(NAME, "saveEvent", async (span) => {
      try {
        const { eventInfo, items, tickets } = eventData;

        span?.setAttribute("org_url", organizer.orgURL);
        span?.setAttribute("ticket_count", tickets.length);
        span?.setAttribute("event_slug", eventInfo.slug);
        span?.setAttribute("event_name", eventInfo.name.en);

        if (!(await this.syncEventInfos(organizer, event, eventInfo))) {
          throw new Error(
            `[DEVCONNECT PRETIX] Aborting sync due to error in updating event info`
          );
        }

        if (!(await this.syncItemInfos(organizer, event, items))) {
          throw new Error(
            `[DEVCONNECT PRETIX] Aborting sync due to error in updating item info`
          );
        }

        if (!(await this.syncTickets(organizer, event, tickets))) {
          throw new Error(`[DEVCONNECT PRETIX] Error updating tickets`);
        }
      } catch (e) {
        logger("[DEVCONNECT PRETIX] Sync aborted due to errors", e);
        setError(e, span);
        this.rollbarService?.reportError(e);
      }
    });
  }

  /**
   * Sync, and update data for Pretix event.
   * Returns whether update was successful.
   */
  private async syncEventInfos(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig,
    eventInfo: DevconnectPretixEvent
  ): Promise<boolean> {
    return traced(NAME, "syncEventInfos", async (span) => {
      span?.setAttribute("org_url", organizer.orgURL);
      span?.setAttribute("event_slug", event.eventID);
      span?.setAttribute("event_name", eventInfo.name?.en);

      const { orgURL } = organizer;
      const { eventID, id: eventConfigID } = event;

      try {
        const {
          name: { en: eventNameFromAPI }
        } = eventInfo;
        const existingEvent = await fetchPretixEventInfo(
          this.db,
          eventConfigID
        );
        if (!existingEvent) {
          await insertPretixEventsInfo(
            this.db,
            eventNameFromAPI,
            eventConfigID
          );
        } else {
          await updatePretixEventsInfo(
            this.db,
            existingEvent.id,
            eventNameFromAPI,
            false
          );
        }
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] Error while syncing event for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        this.rollbarService?.reportError(e);
        setError(e, span);
        return false;
      }

      return true;
    });
  }

  /**
   * Sync, check, and update data for Pretix active items under event.
   * Returns whether update was successful.
   */
  private async syncItemInfos(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig,
    itemsFromAPI: DevconnectPretixItem[]
  ): Promise<boolean> {
    return traced(NAME, "syncItemInfos", async (span) => {
      span?.setAttribute("org_url", organizer.orgURL);
      span?.setAttribute("event_slug", event.eventID);
      span?.setAttribute(
        "item_names",
        itemsFromAPI.map((item) => `'${item.name}'`).join(", ")
      );

      const { orgURL } = organizer;
      const { eventID, activeItemIDs, id: eventConfigID } = event;

      try {
        const eventInfo = await fetchPretixEventInfo(this.db, eventConfigID);

        if (!eventInfo) {
          throw new Error(
            `Couldn't find an event info matching event config id ${eventConfigID}`
          );
        }

        span?.setAttribute("event_name", eventInfo?.event_name);

        const newItemIDsSet = new Set(itemsFromAPI.map((i) => i.id.toString()));
        const activeItemIDsSet = new Set(activeItemIDs);
        // Ensure all configured "active items" exist under the Pretix event's returned items.
        // If any do not exist under active items, log an error and stop syncing.
        if (activeItemIDs.some((i) => !newItemIDsSet.has(i))) {
          throw new Error(
            `One or more of event's active items no longer exist on Pretix.\n` +
              `old event set: ${activeItemIDs.join(",")}\n` +
              `new event set: ${Array.from(newItemIDsSet).join(",")}\n`
          );
        }
        const newActiveItems = itemsFromAPI.filter((i) =>
          activeItemIDsSet.has(i.id.toString())
        );

        const newActiveItemsByItemID = new Map(
          newActiveItems.map((i) => [i.id.toString(), i])
        );
        const existingItemsInfo = await fetchPretixItemsInfoByEvent(
          this.db,
          eventInfo.id
        );
        const existingItemsInfoByItemID = new Map(
          existingItemsInfo.map((i) => [i.item_id, i])
        );
        const itemsToInsert = newActiveItems.filter(
          (i) => !existingItemsInfoByItemID.has(i.id.toString())
        );

        // Step 1 of saving: insert items that are new
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Inserting ${itemsToInsert.length} item infos`
        );
        for (const item of itemsToInsert) {
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Inserting item info ${JSON.stringify(item)}`
          );
          await insertPretixItemsInfo(
            this.db,
            item.id.toString(),
            eventInfo.id,
            getI18nString(item.name)
          );
        }
        span?.setAttribute("items_inserted", itemsToInsert.length);

        // Step 2 of saving: update items that have changed
        // Filter to items that existed before, and filter to those that have changed.
        const itemsToUpdate = newActiveItems
          .filter((i) => existingItemsInfoByItemID.has(i.id.toString()))
          .filter((i) => {
            const oldItem = existingItemsInfoByItemID.get(
              i.id.toString()
            ) as PretixItemInfo;
            return oldItem.item_name !== getI18nString(i.name);
          });

        // For the active item that have changed, update them in the database.
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Updating ${itemsToUpdate.length} item infos`
        );
        for (const item of itemsToUpdate) {
          const oldItem = existingItemsInfoByItemID.get(
            item.id.toString()
          ) as PretixItemInfo;
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Updating item info ${JSON.stringify(
              oldItem
            )} to ${JSON.stringify({
              ...oldItem,
              item_name: getI18nString(item.name)
            })}`
          );
          await updatePretixItemsInfo(
            this.db,
            oldItem.id,
            getI18nString(item.name),
            false
          );
        }
        span?.setAttribute("items_updated", itemsToUpdate.length);

        // Step 3 of saving: remove items that are not active anymore
        const itemsToRemove = existingItemsInfo.filter(
          (existing) => !newActiveItemsByItemID.has(existing.item_id)
        );
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}]  Deleting ${itemsToRemove.length} item infos`
        );
        for (const item of itemsToRemove) {
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Deleting item info ${JSON.stringify(item)}`
          );
          await softDeletePretixItemInfo(this.db, item.id);
        }
        span?.setAttribute("items_deleted", itemsToRemove.length);
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] Error while syncing items for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        this.rollbarService?.reportError(e);
        setError(e, span);
        return false;
      }

      return true;
    });
  }

  /**
   * Sync and update data for Pretix tickets under event.
   * Returns whether update was successful.
   */
  private async syncTickets(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig,
    pretixOrders: DevconnectPretixOrder[]
  ): Promise<boolean> {
    return traced(NAME, "syncTickets", async (span) => {
      span?.setAttribute("org_url", organizer.orgURL);
      span?.setAttribute("event_slug", event.eventID);

      const { orgURL } = organizer;
      const { eventID, id: eventConfigID } = event;

      try {
        const eventInfo = await fetchPretixEventInfo(this.db, eventConfigID);

        if (!eventInfo) {
          throw new Error(
            `Couldn't find an event info matching event config id ${eventConfigID}`
          );
        }
        span?.setAttribute("event_name", eventInfo.event_name);

        // Fetch updated version after DB updates
        const updatedItemsInfo = await fetchPretixItemsInfoByEvent(
          this.db,
          eventInfo.id
        );

        const ticketsFromPretix = this.ordersToDevconnectTickets(
          pretixOrders,
          updatedItemsInfo
        );

        const newTicketsByPositionId = new Map(
          ticketsFromPretix.map((t) => [t.position_id, t])
        );
        const existingTickets = await fetchDevconnectPretixTicketsByEvent(
          this.db,
          eventConfigID
        );
        const existingTicketsByPositionId = new Map(
          existingTickets.map((t) => [t.position_id, t])
        );
        const newTickets = ticketsFromPretix.filter(
          (t) => !existingTicketsByPositionId.has(t.position_id)
        );

        // Step 1 of saving: insert tickets that are new
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Inserting ${newTickets.length} new tickets`
        );
        for (const ticket of newTickets) {
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Inserting ticket ${JSON.stringify(ticket)}`
          );

          // This is the first time we've seen this ticket, and it's already checked in
          if (ticket.is_consumed) {
            ticket.checker = "Pretix";
          }

          await insertDevconnectPretixTicket(this.db, ticket);
        }

        // Step 2 of saving: update tickets that have changed
        // Filter to tickets that existed before, and filter to those that have changed.
        const updatedTickets = ticketsFromPretix
          .filter((t) => existingTicketsByPositionId.has(t.position_id))
          .filter((t) => {
            const oldTicket = existingTicketsByPositionId.get(
              t.position_id
            ) as DevconnectPretixTicketDB;
            const newTicket = t;
            return pretixTicketsDifferent(oldTicket, newTicket);
          });

        // For the tickets that have changed, update them in the database.
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Updating ${updatedTickets.length} tickets`
        );
        for (const updatedTicket of updatedTickets) {
          const oldTicket = existingTicketsByPositionId.get(
            updatedTicket.position_id
          );
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Updating ticket ${JSON.stringify(oldTicket)} to ${JSON.stringify(
              updatedTicket
            )}`
          );

          // If a ticket has been checked in on Pretix, but was not checked
          // in on our side, then consume it.
          if (!oldTicket?.is_consumed && updatedTicket.is_consumed) {
            updatedTicket.checker = "Pretix";
          } else {
            // Otherwise preserve whatever the checker value was from the
            // old ticket
            updatedTicket.checker = oldTicket?.checker as string;
          }

          // If the ticket was pending sync, ignore the fact that Pretix is
          // telling us it's not checked in.
          if (
            oldTicket?.is_consumed &&
            !oldTicket.pretix_checkin_timestamp &&
            !updatedTicket.is_consumed
          ) {
            updatedTicket.is_consumed = true;
          }

          await updateDevconnectPretixTicket(this.db, updatedTicket);
        }

        // Step 3 of saving: soft delete tickets that don't exist anymore
        const removedTickets = existingTickets.filter(
          (existing) => !newTicketsByPositionId.has(existing.position_id)
        );
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Deleting ${removedTickets.length} tickets`
        );
        for (const removedTicket of removedTickets) {
          logger(
            `[DEVCONNECT PRETIX] [${organizer.orgURL}::${
              eventInfo.event_name
            }] Deleting ticket ${JSON.stringify(removedTicket)}`
          );
          await softDeleteDevconnectPretixTicket(this.db, removedTicket);
        }

        span?.setAttribute("ticketsInserted", newTickets.length);
        span?.setAttribute("ticketsUpdated", updatedTickets.length);
        span?.setAttribute("ticketsDeleted", removedTickets.length);
        span?.setAttribute(
          "ticketsTotal",
          existingTickets.length + newTickets.length - removedTickets.length
        );
      } catch (e) {
        logger(
          `[DEVCONNECT PRETIX] error while syncing for ${orgURL} and ${eventID}, skipping update`,
          { error: e }
        );
        this.rollbarService?.reportError(e);
        setError(e, span);
        return false;
      }
      return true;
    });
  }

  /**
   * Converts a given list of orders to tickets, and sets
   * all of their roles to equal the given role. When `subEvents`
   * is passed in as a parameter, cross-reference them with the
   * orders, and set the visitor date ranges for the new
   * `DevconnectPretixTicket` to equal to the date ranges of the visitor
   * subevent events they have in their order.
   */
  private ordersToDevconnectTickets(
    orders: DevconnectPretixOrder[],
    itemsInfo: PretixItemInfo[]
  ): DevconnectPretixTicket[] {
    // Go through all orders and aggregate all item IDs under
    // the same (email, event_id, organizer_url) tuple. Since we're
    // already fixing the event_id and organizer_url in this function,
    // we just need to have the email as the key for this map.
    const itemsInfoByItemID = new Map(itemsInfo.map((i) => [i.item_id, i]));
    const tickets: DevconnectPretixTicket[] = [];
    for (const order of orders) {
      // check that they paid
      if (order.status !== "p") {
        continue;
      }
      for (const {
        id,
        positionid,
        item,
        attendee_name,
        attendee_email,
        secret,
        checkins
      } of order.positions) {
        const existingItem = itemsInfoByItemID.get(item.toString());
        if (existingItem) {
          // Try getting email from response to question; otherwise, default to email of purchaser
          if (!attendee_email) {
            logger(
              `[DEVCONNECT PRETIX] Encountered order position without attendee email, defaulting to order email`,
              JSON.stringify({
                orderCode: order.code,
                positionID: positionid,
                orderEmail: order.email
              })
            );
          }
          const email = (attendee_email || order.email).toLowerCase();
          const checkin_timestamp =
            checkins.length > 0 ? new Date(checkins[0].datetime) : null;

          tickets.push({
            email,
            full_name: attendee_name,
            devconnect_pretix_items_info_id: existingItem.id,
            is_deleted: false,
            is_consumed: checkin_timestamp !== null,
            position_id: id.toString(),
            secret,
            checker: "Pretix",
            checkin_timestamp,
            pretix_checkin_timestamp: checkin_timestamp
          });
        }
      }
    }
    return tickets;
  }

  /**
   * Sync the fetched data to the DB.
   */
  private async save(fetchedData: EventDataFromPretix[]): Promise<void> {
    for (const { data, event } of fetchedData) {
      // This will throw an exception if it fails
      await this.saveEvent(this.organizer, event, data);
    }
  }
}
