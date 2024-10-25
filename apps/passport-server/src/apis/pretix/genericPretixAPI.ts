import {
  GenericPretixCheckinList,
  GenericPretixCheckinListSchema,
  GenericPretixEvent,
  GenericPretixEventSchema,
  GenericPretixEventSettings,
  GenericPretixEventSettingsSchema,
  GenericPretixOrder,
  GenericPretixOrderSchema,
  GenericPretixProduct,
  GenericPretixProductCategory,
  GenericPretixProductCategorySchema,
  GenericPretixProductSchema
} from "@pcd/passport-interface";
import { setMaxListeners } from "events";
import PQueue from "p-queue";
import { z } from "zod";
import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";
import { instrumentedFetch } from "../fetch";

const TRACE_SERVICE = "GenericPretixAPI";

export interface IGenericPretixAPI {
  /**
   * Orders contain many positions, which basically correspond to tickets on our end.
   */
  fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixOrder[]>;
  /**
   * On Pretix you can sell several different types of things to your
   * 'event attendees'. You can sell different tiers of tickets - GA, VIP, etc.
   * You can also sell [add-ons](https://docs.pretix.eu/en/latest/api/resources/item_add-ons.html) -
   * items that can be bought *in addition* to another product type. E.g. you could offer
   * to sell t-shirts in addition to a GA ticket, but the VIP just gets a t-shirt for
   * free, so they don't have to 'buy' anything - their VIP ticket grants them access to a t-shirt.
   */
  fetchProducts(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixProduct[]>;
  fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixEvent>;
  fetchEventCheckinLists(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixCheckinList[]>;
  fetchEventSettings(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixEventSettings>;
  fetchProductCategories(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixProductCategory[]>;
  fetchAllEvents(
    orgUrl: string,
    token: string,
    abortController?: AbortController
  ): Promise<GenericPretixEvent[]>;
  /**
   * It would probably be good practice to have some sort of lock on the act
   * of checking in a generic issuance ticket for a particular external event id.
   * We do not want to introduce surface area for double-spend.
   */
  pushCheckin(
    orgUrl: string,
    token: string,
    positionSecret: string,
    checkinListId: string,
    timestamp: string,
    abortController?: AbortController
  ): Promise<void>;
  cancelPendingRequests(): void;
}

export interface GenericPretixAPIOptions {
  requestsPerInterval?: number;
  concurrency?: number;
  intervalMs?: number;
}

/**
 * This manages a rate-limiter queue for a single organizer. Pretix rate-limits
 * requests on a per-organizer basis, so we instantiate a new queue every time
 * we see a request for an organizer we haven't seen before. Old queues are
 * deleted once they go idle (when they have no queued items and all promises
 * have resolved).
 *
 * By default, we limit concurrency to 1, meaning that only one request can
 * occur at a time.
 */
class OrganizerRequestQueue {
  private readonly maxConcurrentRequests: number;
  private readonly intervalCap: number;
  private readonly interval: number;
  private cancelController: AbortController;
  private requestQueue: PQueue;

  public constructor(
    options: Required<GenericPretixAPIOptions>,
    cancelController: AbortController,
    onIdle: () => void
  ) {
    this.intervalCap = options.requestsPerInterval;
    this.maxConcurrentRequests = options.concurrency;
    this.interval = options.intervalMs;
    this.cancelController = cancelController;
    this.requestQueue = new PQueue({
      concurrency: this.maxConcurrentRequests,
      interval: this.interval,
      intervalCap: this.intervalCap
    });
    // The "idle" handler can be used by the caller to delete this queue once
    // it is no longer doing anything.
    this.requestQueue.on("idle", onIdle);
  }

  /**
   * Performs a HTTP fetch, but using a queue to ensure that we wait if we are
   * at our rate limit.
   */
  public fetch(
    input: RequestInfo | URL,
    init?: RequestInit,
    priority?: number,
    abort?: AbortController
  ): Promise<Response> {
    // Set up an abort controller for this request. This is used to cancel
    // pending requests, e.g. during app shutdown.
    const abortController = abort ?? new AbortController();
    const abortHandler = (): void => {
      abortController.abort();
    };

    // Trigger the abort signal if our main "cancel" controller fires.
    this.cancelController.signal.addEventListener("abort", abortHandler);

    return this.requestQueue.add(
      async () => {
        try {
          const result = await instrumentedFetch(input, {
            signal: abortController.signal,
            ...init
          });

          // If Pretix tells us that we've exceeded the rate limit, log a
          // specific message. This should never happen, and would indicate that
          // our rate-limiting is too loose or not working correctly.
          if (result.status === 429) {
            logger(
              `[GENERIC PRETIX] Received 429 error while fetching ${input.toString()}.
          API client is currently enforcing a limit of ${
            this.intervalCap
          } requests per ${this.interval} milliseconds.`
            );
          }

          return result;
        } finally {
          // The cancel controller has a maximum number of event listeners, so
          // always remove event listeners once they're not needed.
          this.cancelController.signal.removeEventListener(
            "abort",
            abortHandler
          );
        }
      },
      { priority: priority ?? 0 }
    );
  }
}

/**
 * Generic Pretix API client. Provides utility functions for making requests to
 * Pretix APIs, and manages queues on a per-organizer basis.
 */
export class GenericPretixAPI implements IGenericPretixAPI {
  private cancelController: AbortController;
  private readonly maxConcurrentRequests: number;
  private readonly intervalCap: number;
  private readonly interval: number;
  private organizerQueues: Record<string, OrganizerRequestQueue>;

  public constructor(options?: GenericPretixAPIOptions) {
    // These configuration options apply to the per-organizer queues:
    // By default, allow 100 requests per organizer per minute. Pretix maximum
    // is 300.
    this.intervalCap = options?.requestsPerInterval ?? 100;
    // By default, allow one request at a time (per organizer).
    this.maxConcurrentRequests = options?.concurrency ?? 1;
    // Rate limit time period is 60 seconds (one minute).
    this.interval = options?.intervalMs ?? 60_000;
    // No organizer queues exist at startup.
    this.organizerQueues = {};
    // Used to cancel all pending requests.
    this.cancelController = this.newCancelController();
  }

  private newCancelController(): AbortController {
    const ac = new AbortController();
    // Since we never have more than maxConcurrentRequests at the same time,
    // there should never be more than that number of event listeners.
    setMaxListeners(this.maxConcurrentRequests, ac.signal);
    return ac;
  }

  public cancelPendingRequests(): void {
    this.cancelController.abort();
    this.cancelController = this.newCancelController();
  }

  /**
   * Given an orgUrl, find an existing queue for that organizer, or create a
   * new one and store a reference to it, then return the queue.
   *
   * Pretix does rate-limiting on a per-organizer basis, so we want to have
   * exactly one queue per organizer. Using a single queue for all organizers
   * would throttle too soon.
   */
  private getOrCreateQueue(orgUrl: string): OrganizerRequestQueue {
    let queue: OrganizerRequestQueue = this.organizerQueues[orgUrl];
    if (!queue) {
      queue = new OrganizerRequestQueue(
        {
          intervalMs: this.interval,
          requestsPerInterval: this.intervalCap,
          concurrency: this.maxConcurrentRequests
        },
        this.cancelController,
        () => {
          delete this.organizerQueues[orgUrl];
        }
      );
      this.organizerQueues[orgUrl] = queue;
    }

    return queue;
  }

  public async fetchAllEvents(
    orgUrl: string,
    token: string,
    abortController?: AbortController
  ): Promise<GenericPretixEvent[]> {
    return traced(TRACE_SERVICE, "fetchAllEvents", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const events: GenericPretixEvent[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events`;
      while (url) {
        logger(`[GENERIC PRETIX] Fetching events: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(
          url,
          {
            headers: { Authorization: `Token ${token}` }
          },
          0,
          abortController
        );
        if (!res.ok) {
          throw new Error(
            `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();

        const results = z
          .array(GenericPretixEventSchema)
          .safeParse(page.results);
        if (results.success) {
          events.push(...results.data);
        } else {
          throw new Error(
            `[GENERIC PRETIX] Error parsing response from ${url}: ${results.error.message}`
          );
        }
        url = page.next;
      }

      return events;
    });
  }

  public async fetchEvent(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixEvent> {
    return traced(TRACE_SERVICE, "fetchEvent", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event API
      const url = `${orgUrl}/events/${eventID}/`;
      logger(`[GENERIC PRETIX] Fetching event: ${url}`);
      const res = await this.getOrCreateQueue(orgUrl).fetch(
        url,
        {
          headers: { Authorization: `Token ${token}` }
        },
        0,
        abortController
      );
      if (!res.ok) {
        throw new Error(
          `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
        );
      }
      const result = GenericPretixEventSchema.safeParse(await res.json());
      if (result.success) {
        return result.data;
      } else {
        throw new Error(
          `[GENERIC PRETIX] Error parsing response from ${url}: ${result.error.message}`
        );
      }
    });
  }

  public async fetchEventSettings(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixEventSettings> {
    return traced(TRACE_SERVICE, "fetchEventSettings", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event settings API
      const url = `${orgUrl}/events/${eventID}/settings`;
      logger(`[GENERIC PRETIX] Fetching event settings: ${url}`);
      const res = await this.getOrCreateQueue(orgUrl).fetch(
        url,
        {
          headers: { Authorization: `Token ${token}` }
        },
        0,
        abortController
      );
      if (!res.ok) {
        throw new Error(
          `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
        );
      }
      const result = GenericPretixEventSettingsSchema.safeParse(
        await res.json()
      );
      if (result.success) {
        return result.data;
      } else {
        throw new Error(
          `[GENERIC PRETIX] Error parsing response from ${url}: ${result.error.message}`
        );
      }
    });
  }

  public async fetchProductCategories(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixProductCategory[]> {
    return traced(TRACE_SERVICE, "fetchAddons", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const categories: GenericPretixProductCategory[] = [];

      // Fetch categories from paginated API
      let url = `${orgUrl}/events/${eventID}/categories/`;
      while (url) {
        logger(`[GENERIC PRETIX] Fetching categories: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(
          url,
          {
            headers: { Authorization: `Token ${token}` }
          },
          0,
          abortController
        );
        if (!res.ok) {
          throw new Error(
            `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        const results = z
          .array(GenericPretixProductCategorySchema)
          .safeParse(page.results);
        if (results.success) {
          categories.push(...results.data);
        } else {
          throw new Error(
            `[GENERIC PRETIX] Error parsing response from ${url}: ${results.error.message}`
          );
        }
        url = page.next;
      }

      return categories;
    });
  }

  public async fetchProducts(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixProduct[]> {
    return traced(TRACE_SERVICE, "fetchItems", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const items: GenericPretixProduct[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/items/`;
      while (url) {
        logger(`[GENERIC PRETIX] Fetching items: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(
          url,
          {
            headers: { Authorization: `Token ${token}` }
          },
          0,
          abortController
        );
        if (!res.ok) {
          throw new Error(
            `[GENERIC] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        const results = z
          .array(GenericPretixProductSchema)
          .safeParse(page.results);
        if (results.success) {
          items.push(...results.data);
        } else {
          throw new Error(
            `[GENERIC PRETIX] Error parsing response from ${url}: ${results.error.message}`
          );
        }
        url = page.next;
      }

      return items;
    });
  }

  // Fetch all orders for a given event.
  public async fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const orders = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/orders/`;
      while (url) {
        logger(`[GENERIC PRETIX] Fetching orders ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(
          url,
          {
            headers: { Authorization: `Token ${token}` }
          },
          0,
          abortController
        );
        if (!res.ok) {
          throw new Error(
            `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        const results = z
          .array(GenericPretixOrderSchema)
          .safeParse(page.results);
        if (results.success) {
          orders.push(...results.data);
        } else {
          throw new Error(
            `[GENERIC PRETIX] Error parsing response from ${url}: ${results.error.message}`
          );
        }
        url = page.next;
      }

      return orders;
    });
  }

  /**
   * When checking in, it is necessary to provide one or more checkin
   * list IDs: https://docs.pretix.eu/en/latest/api/resources/checkin.html
   *
   * Events can have multiple checkin lists, though we tell users to set
   * up only one, and we throw an error if anything other than one checkin
   * list is found {@link PretixPipeline#validateEventData}.
   *
   * When checking in, we use the checkin list ID of the sole checkin list.
   */
  public async fetchEventCheckinLists(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixCheckinList[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const lists: GenericPretixCheckinList[] = [];

      // Fetch check-in lists from paginated API
      let url = `${orgUrl}/events/${eventID}/checkinlists/`;
      while (url) {
        logger(`[GENERIC PRETIX] Fetching orders ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(
          url,
          {
            headers: { Authorization: `Token ${token}` }
          },
          0,
          abortController
        );
        if (!res.ok) {
          throw new Error(
            `[GENERIC PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
          );
        }
        const page = await res.json();
        const results = z
          .array(GenericPretixCheckinListSchema)
          .safeParse(page.results);
        if (results.success) {
          lists.push(...results.data);
        } else {
          throw new Error(
            `[GENERIC PRETIX] Error parsing response from ${url}: ${results.error.message}`
          );
        }
        url = page.next;
      }

      return lists;
    });
  }

  // Push a check-in to Pretix
  public async pushCheckin(
    orgUrl: string,
    token: string,
    positionSecret: string,
    checkinListId: string,
    timestamp: string,
    abortController?: AbortController
  ): Promise<void> {
    return traced(TRACE_SERVICE, "pushCheckin", async (span) => {
      span?.setAttribute("org_url", orgUrl);

      const url = `${orgUrl}/checkinrpc/redeem/`;

      const res = await this.getOrCreateQueue(orgUrl).fetch(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            secret: positionSecret,
            lists: [checkinListId],
            datetime: timestamp
          })
        },
        // Priority greater than zero means that this will jump the queue and
        // be processed next, necessary if we happen to be running a sync at
        // the time of check-in.
        1,
        abortController
      );

      if (!res.ok) {
        throw new Error(
          `[GENERIC PRETIX] Error pushing ${url}: ${res.status} ${res.statusText}`
        );
      }
    });
  }
}

export function getGenericPretixAPI(): GenericPretixAPI {
  return new GenericPretixAPI();
}
