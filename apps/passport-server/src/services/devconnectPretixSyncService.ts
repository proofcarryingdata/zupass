import { EventEmitter } from "events";
import PQueue from "p-queue";
import { Pool } from "postgres-pool";
import {
  DevconnectPretixEvent,
  DevconnectPretixEventSettings,
  DevconnectPretixItem,
  DevconnectPretixOrder,
  FetchFn,
  IDevconnectPretixAPI,
  getI18nString
} from "../apis/devconnect/devconnectPretixAPI";
import {
  DevconnectPretixEventConfig,
  DevconnectPretixOrganizerConfig,
  getDevconnectPretixConfig
} from "../apis/devconnect/organizer";
import { DevconnectPretixTicket, PretixItemInfo } from "../database/models";
import { fetchDevconnectPretixTicketsByEvent } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import { insertDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/insertDevconnectPretixTicket";
import { softDeleteDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/softDeleteDevconnectPretixTicket";
import { updateDevconnectPretixTicket } from "../database/queries/devconnect_pretix_tickets/updateDevconnectPretixTicket";
import {
  fetchPretixEventInfo,
  insertPretixEventsInfo,
  updatePretixEventsInfo
} from "../database/queries/pretixEventInfo";
import {
  fetchPretixItemsInfoByEvent,
  insertPretixItemsInfo,
  softDeletePretixItemInfo,
  updatePretixItemsInfo
} from "../database/queries/pretixItemInfo";
import { ApplicationContext } from "../types";
import { pretixTicketsDifferent } from "../util/devconnectTicket";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";
import { SemaphoreService } from "./semaphoreService";
import { setError, traced } from "./telemetryService";

const NAME = "Devconnect Pretix";

// Collection of API data for a single event
interface EventData {
  settings: DevconnectPretixEventSettings;
  eventInfo: DevconnectPretixEvent;
  items: DevconnectPretixItem[];
  tickets: DevconnectPretixOrder[];
}

type SyncPhase = "fetching" | "validating" | "saving";

type FetchOutcome = "complete" | "rate-limited";

interface SyncErrorCause {
  success: false;
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
    return { success: false, phase, error: originalError, organizerId };
  } else {
    throw new Error(`originalError is not an error`);
  }
}

/**
 * We have a concept of a sync "run", which occurs on an interval.
 * A run can fail, can complete synchronization, or can be suspended due
 * to rate-limiting on requests to Pretix.
 *
 * In order to do a full synchronization for a given organizer, multiple
 * runs may be required if rate-limiting makes it impossible to fetch
 * all of the necessary data in a single run.
 */
interface SyncRunSuccess {
  success: true;
  organizerId: string;
  outcome: "complete" | "rate-limited";
}

type SyncResult = SyncRunSuccess | SyncErrorCause;

/**
 * This class implements a rate-limited fetcher. It provides a function
 * which can be passed to the Pretix fetch functions, in place of the
 * native 'fetch' API call. Behind the scenes, this function will
 * increment a counter. When the counter exceeds the limit, the call to
 * the fetcher function will suspend until the counter is reset. When
 * this happens, an event is raised. In this system, we use this event
 * to mark a sync run as "rate-limited", allowing us to complete the run
 * and resume fetching the remaining data on the next run, when we will
 * reset the counter.
 */
class LimitedFetcher extends EventEmitter {
  // The maximum number of requests to allow
  private limit: number;
  // The number of requests made so far
  private count: number;

  public constructor(limit: number) {
    super();
    this.limit = limit;
    this.count = 0;
  }

  public reset(): void {
    this.count = 0;
    this.emit("reset");
  }

  // Returns a function which matches the signature of the 'fetch' API
  public fetcher(): FetchFn {
    return async (input, init?) => {
      if (this.count >= this.limit) {
        // We are stuck at the limit, so do nothing until reset
        // By awaiting here, we will pause indefinitely, relying on
        // another system to reset our counter. In the sync context, the
        // counter will be reset on each run, allowing us to pick up the
        // request we were limited from making on the previous run.
        this.emit("pause");
        await new Promise<void>((resolve) => {
          this.once("reset", () => {
            resolve();
          });
        });
      }
      this.count++;
      return fetch(input, init);
    };
  }

  public getCount(): number {
    return this.count;
  }
}

/**
 * For the purposes of sync, organizers are isolated from each other.
 * A failure for one organizer should not prevent other organizers from
 * completing sync. Organizers also have independent rate limits with
 * Pretix.
 */
export class OrganizerSync {
  // This queue allows the sync system to limit concurrent DB access
  public dbQueue: PQueue;
  private organizer: DevconnectPretixOrganizerConfig;
  private pretixAPI: IDevconnectPretixAPI;
  private fetcher: LimitedFetcher;
  // A promise which resolves only when sync fully completes
  private fetchPromise?: Promise<"complete">;
  private rollbarService: RollbarService | null;
  private db: Pool;
  private fetchedData?: {
    data: EventData;
    event: DevconnectPretixEventConfig;
  }[];

  public constructor(
    dbQueue: PQueue,
    organizer: DevconnectPretixOrganizerConfig,
    fetchesPerCycle: number,
    pretixAPI: IDevconnectPretixAPI,
    rollbarService: RollbarService | null,
    db: Pool
  ) {
    this.dbQueue = dbQueue;
    this.organizer = organizer;
    this.pretixAPI = pretixAPI;
    this.rollbarService = rollbarService;
    this.db = db;
    this.fetcher = new LimitedFetcher(fetchesPerCycle);
  }

  // Utility function to return a SyncRunSuccess for a rate-limited run
  private rateLimitedSuccess(): SyncRunSuccess {
    return {
      success: true,
      outcome: "rate-limited",
      organizerId: this.organizer.id
    };
  }

  // Utility function to return a SyncRunSuccess for a complete run
  private completeSuccess(): SyncRunSuccess {
    return {
      success: true,
      outcome: "complete",
      organizerId: this.organizer.id
    };
  }

  // Conduct a single sync run
  public async run(): Promise<SyncRunSuccess> {
    try {
      const fetchResult = await this.fetchData();

      if (fetchResult === "rate-limited") {
        return this.rateLimitedSuccess();
      }
    } catch (e) {
      logger(
        `[DEVCONNECT PRETIX]: Encountered error when fetching data for ${this.organizer.id}: ${e}`
      );
      this.rollbarService?.reportError(e);

      throw new Error("Data failed to validate", {
        cause: errorCause("fetching", this.organizer.id, e)
      });
    }

    try {
      this.validate();
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
      await this.save();
    } catch (e) {
      logger(
        `[DEVCONNECT PRETIX]: Encountered error when saving data for ${this.organizer.id}: ${e}`
      );
      this.rollbarService?.reportError(e);

      throw new Error("Data failed to validate", {
        cause: errorCause("saving", this.organizer.id, e)
      });
    }

    return this.completeSuccess();
  }

  /**
   * Fetches data from Pretix. This will return a FetchOutcome, which
   * can be either "rate-limited" or "complete". This is achieved by
   * having two promises, one which resolves when we get rate-limited,
   * and one which resolves when we finish fetching all available data.
   *
   * The first promise gets created on every run (that is, every time
   * the function is called). It simply listens for the fetcher's pause
   * event, and resolves if it is triggered.
   *
   * The second promise is potentially longer-lived, and survives across
   * multiple calls. This is because it starts the fetching process,
   * which may become paused due to rate-limiting.
   *
   * On each call, we reset the fetcher's count, which will un-pause the
   * long-lived promise (if active). This causes it to resume, and will
   * allow it to resolve its promise with the value of "complete".
   */
  private async fetchData(): Promise<FetchOutcome> {
    // This promise will resolve if we get rate-limited
    const pausePromise = new Promise<"rate-limited">((resolve) => {
      this.fetcher.once("pause", () => {
        resolve("rate-limited");
      });
    });

    // Reset the rate-limit for the fetcher.
    // If the job below is paused, this will un-pause it.
    this.fetcher.reset();

    // If fetchPromise exists, then we already have an active promise
    // which was rate-limited on a previous run. Only start a new one if
    // the previous one completed fully.
    if (!this.fetchPromise) {
      this.fetchPromise = (async (): Promise<"complete"> => {
        this.fetchedData = [];
        for (const event of this.organizer.events) {
          this.fetchedData.push({
            event,
            data: await this.fetchEventData(
              this.organizer,
              event,
              this.fetcher.fetcher()
            )
          });
        }
        this.fetcher.removeAllListeners("pause");
        this.fetchPromise = undefined;
        return "complete";
      })();
    }

    // Either of the two promises above might resolve, depending on
    // whether we get rate-limited. Either is a successful outcome for
    // the run.
    return Promise.any([pausePromise, this.fetchPromise]);
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
  private checkEventData(
    eventData: EventData,
    eventConfig: DevconnectPretixEventConfig
  ): string[] {
    const { settings, items } = eventData;
    const activeItemIdSet = new Set(eventConfig.activeItemIDs);

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

    for (const item of items) {
      // Ignore items which are not in the event's "activeItemIDs" set
      if (activeItemIdSet.has(item.id.toString())) {
        const itemErrors = this.validateEventItem(item);
        if (itemErrors.length > 0) {
          errors.push(
            `Product "${item.name.en}" (${item.id}) in event "${eventData.eventInfo.name.en}" is invalid:\n` +
              itemErrors.join("\n")
          );
        }
      }
    }

    return errors;
  }

  /**
   * Validate fetched data, or throw an exception
   */
  private validate(): void {
    const errors = [];

    if (!this.fetchedData) {
      throw new Error("No fetched data to validate");
    }

    for (const { data, event } of this.fetchedData) {
      errors.push(...this.checkEventData(data, event));
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
    event: DevconnectPretixEventConfig,
    fetch: FetchFn
  ): Promise<EventData> {
    return traced(NAME, "fetchEventData", async () => {
      const { orgURL, token } = organizer;
      const { eventID } = event;

      const settings = await this.pretixAPI.fetchEventSettings(
        orgURL,
        token,
        eventID,
        fetch
      );

      const items = await this.pretixAPI.fetchItems(
        orgURL,
        token,
        eventID,
        fetch
      );

      const eventInfo = await this.pretixAPI.fetchEvent(
        orgURL,
        token,
        eventID,
        fetch
      );

      const tickets = await this.pretixAPI.fetchOrders(
        orgURL,
        token,
        eventID,
        fetch
      );

      return { settings, items, eventInfo, tickets };
    });
  }

  /**
   * Sync a single event.
   * This coordinates the syncing of event info, items, and tickets to the DB.
   * No actual fetching from Pretix happens here, as the data was already
   * fetched when checking for validity.
   */
  private async syncEvent(
    organizer: DevconnectPretixOrganizerConfig,
    event: DevconnectPretixEventConfig,
    eventData: EventData
  ): Promise<void> {
    return traced("Devconnect Sync", "syncEvent", async (span) => {
      try {
        const { eventInfo, items, tickets } = eventData;

        span?.setAttribute("org_url", organizer.orgURL);
        span?.setAttribute("ticket_count", tickets.length);
        span?.setAttribute("event_slug", eventInfo.slug);
        span?.setAttribute("event_name", eventInfo.name.en);

        if (!(await this.syncEventInfos(organizer, event, eventInfo))) {
          logger(
            `[DEVCONNECT PRETIX] Aborting sync due to error in updating event info`
          );
          return;
        }

        if (!(await this.syncItemInfos(organizer, event, items))) {
          logger(
            `[DEVCONNECT PRETIX] Aborting sync due to error in updating item info`
          );
          return;
        }

        if (!(await this.syncTickets(organizer, event, tickets))) {
          logger(`[DEVCONNECT PRETIX] Error updating tickets`);
          return;
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
            const oldItem = existingItemsInfoByItemID.get(i.id.toString())!;
            return oldItem.item_name !== getI18nString(i.name);
          });

        // For the active item that have changed, update them in the database.
        logger(
          `[DEVCONNECT PRETIX] [${organizer.orgURL}::${eventInfo.event_name}] Updating ${itemsToUpdate.length} item infos`
        );
        for (const item of itemsToUpdate) {
          const oldItem = existingItemsInfoByItemID.get(item.id.toString())!;
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
          await insertDevconnectPretixTicket(this.db, ticket);
        }

        // Step 2 of saving: update tickets that have changed
        // Filter to tickets that existed before, and filter to those that have changed.
        const updatedTickets = ticketsFromPretix
          .filter((t) => existingTicketsByPositionId.has(t.position_id))
          .filter((t) => {
            const oldTicket = existingTicketsByPositionId.get(t.position_id)!;
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
        secret
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

          tickets.push({
            email,
            full_name: attendee_name,
            devconnect_pretix_items_info_id: existingItem.id,
            is_deleted: false,
            is_consumed: false,
            position_id: id.toString(),
            secret
          });
        }
      }
    }
    return tickets;
  }

  /**
   * Sync the fetched data to the DB.
   */
  private async save(): Promise<void> {
    // This ensures a limit on the number of concurrent organizers writing to the DB
    return this.dbQueue.add(async () => {
      if (!this.fetchedData) {
        throw new Error("No fetched data to save");
      }

      for (const { data, event } of this.fetchedData) {
        // This will throw an exception if it fails
        await this.syncEvent(this.organizer, event, data);
      }
    });
  }
}

/**
 * Responsible for syncing users from Pretix into an internal representation.
 */
export class DevconnectPretixSyncService {
  private static readonly SYNC_INTERVAL_MS = 1000 * 60;
  private static readonly PRETIX_RATE_PER_MINUTE = 300;

  private rollbarService: RollbarService | null;
  private semaphoreService: SemaphoreService;
  private db: Pool;
  private timeout: NodeJS.Timeout | undefined;
  private _hasCompletedSyncSinceStarting: boolean;
  private organizers: Map<string, OrganizerSync>;
  private pretixAPI: IDevconnectPretixAPI;
  private dbQueue: PQueue;
  private syncResults: Map<string, SyncResult>;

  public get hasCompletedSyncSinceStarting(): boolean {
    return this._hasCompletedSyncSinceStarting;
  }

  public getSyncResults(): Map<string, SyncResult> {
    return this.syncResults;
  }

  public constructor(
    context: ApplicationContext,
    pretixAPI: IDevconnectPretixAPI,
    rollbarService: RollbarService | null,
    semaphoreService: SemaphoreService
  ) {
    this.db = context.dbPool;
    this.rollbarService = rollbarService;
    this.semaphoreService = semaphoreService;
    this.pretixAPI = pretixAPI;
    this.organizers = new Map();
    this.dbQueue = new PQueue({ concurrency: 1 });
    this._hasCompletedSyncSinceStarting = false;
    this.syncResults = new Map();
  }
  public startSyncLoop(): void {
    logger("[DEVCONNECT PRETIX] Starting sync loop");

    const trySync = async (): Promise<void> => {
      await this.trySync();
      this.timeout = setTimeout(
        () => trySync(),
        DevconnectPretixSyncService.SYNC_INTERVAL_MS
      );
    };

    trySync();
  }

  public async trySync(): Promise<void> {
    try {
      logger("[DEVCONNECT PRETIX] (Re)loading Pretix Config");
      await this.loadConfiguration();

      logger("[DEVCONNECT PRETIX] Sync start");
      await this.sync();
      await this.semaphoreService.reload();
      this._hasCompletedSyncSinceStarting = true;
      logger("[DEVCONNECT PRETIX] Sync successful");
    } catch (e) {
      this.rollbarService?.reportError(e);
      logger("[DEVCONNECT PRETIX] Sync failed", e);
    }
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  /**
   * (Re)load Pretix configuration, and set up organizers.
   */
  private async loadConfiguration(): Promise<void> {
    const devconnectPretixConfig = await getDevconnectPretixConfig(this.db);

    if (!devconnectPretixConfig) {
      throw new Error("Pretix Config could not be loaded");
    }

    const orgIds = new Set(
      devconnectPretixConfig.organizers.map((org) => org.id)
    );

    const previousOrgIds = new Set(this.organizers.keys());
    const removedOrgIds = [...previousOrgIds].filter((x) => !orgIds.has(x));
    const newOrgIds = [...orgIds].filter((x) => !previousOrgIds.has(x));

    // Make sure we have an OrganizerSync for any new organizers.
    // This is also how initial OrganizerSyncs are created.
    for (const id of newOrgIds) {
      const config = devconnectPretixConfig.organizers.find(
        (org) => org.id === id
      ) as DevconnectPretixOrganizerConfig;
      const org = new OrganizerSync(
        this.dbQueue, // To allow sync jobs to avoid concurrent DB access
        config,
        DevconnectPretixSyncService.PRETIX_RATE_PER_MINUTE,
        this.pretixAPI,
        this.rollbarService,
        this.db
      );
      this.organizers.set(id, org);
    }

    for (const id of removedOrgIds) {
      // @todo cleanup any organizers which have pending requests?
      this.organizers.delete(id);
    }
  }

  /**
   * Download Pretix state, and apply a diff to our state so that it
   * reflects the state in Pretix.
   */
  private async sync(): Promise<void> {
    return traced(NAME, "sync", async (span) => {
      span?.setAttribute("organizers_count", this.organizers.size);

      const syncStart = Date.now();
      const organizerPromises = [];
      this.syncResults.clear();

      // Attempt to run each organizer job in parallel
      // Internally the organizers will use a queue to avoid excessive
      // concurrent requests to the DB.
      for (const [id, organizer] of this.organizers.entries()) {
        organizerPromises.push(
          (async (): Promise<SyncResult> => {
            try {
              return await organizer.run();
            } catch (e) {
              logger(
                `[DEVCONNECT PRETIX] Error encounted when synchronizing organizer ${id}`,
                e
              );
              setError(e, span);
              this.rollbarService?.reportError(e);

              // If we're catching an exception here, it really *should*
              // have a .cause of type SyncErrorCause, but we can't type-
              // check this.
              if (
                e instanceof Error &&
                e.cause &&
                e.cause instanceof Object &&
                Object.hasOwn(e.cause, "success") &&
                Object.hasOwn(e.cause, "phase") &&
                Object.hasOwn(e.cause, "error") &&
                Object.hasOwn(e.cause, "organizerId")
              ) {
                return e.cause as SyncErrorCause;
              } else {
                // This should never happen, but let's handle it anyway
                logger(
                  `[DEVCONNECT PRETIX] Unknown error encounted when synchronizing organizer ${id}`,
                  e
                );
                return {
                  success: false,
                  error: new Error(
                    `Unknown error encounted when synchronizing organizer ${id}`
                  ),
                  phase: "saving",
                  organizerId: id
                };
              }
            }
          })()
        );
      }

      // Wait until all organizers have either completed or failed and
      // record results.
      for (const result of await Promise.allSettled(organizerPromises)) {
        if (result.status === "fulfilled") {
          this.syncResults.set(result.value.organizerId, result.value);
        } else {
          // Again, this should never happen - our function above catches
          // all exceptions and returns a SyncResult, so the promise should
          // never be rejected.
          logger(`[DEVCONNECT PRETIX] ERROR: Sync run promise rejected`);
        }
      }

      const syncEnd = Date.now();
      logger(`[DEVCONNECT PRETIX] Sync results: `, this.syncResults);
      logger(
        `[DEVCONNECT PRETIX] Sync end. Completed in ${Math.floor(
          (syncEnd - syncStart) / 1000
        )} seconds`
      );
    });
  }
}

/**
 * Kick off a period sync from Pretix into PCDPassport
 */
export async function startDevconnectPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService | null,
  semaphoreService: SemaphoreService,
  devconnectPretixAPI: IDevconnectPretixAPI | null
): Promise<DevconnectPretixSyncService | null> {
  if (context.isZuzalu) {
    logger("[DEVCONNECT PRETIX] Not starting service because IS_ZUZALU=true");
    return null;
  }

  if (!devconnectPretixAPI) {
    logger(
      "[DEVCONNECT PRETIX] Can't start sync service - no api instantiated"
    );
    return null;
  }

  const pretixSyncService = new DevconnectPretixSyncService(
    context,
    devconnectPretixAPI,
    rollbarService,
    semaphoreService
  );

  pretixSyncService.startSyncLoop();
  return pretixSyncService;
}
