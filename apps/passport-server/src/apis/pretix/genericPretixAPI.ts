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
    pretixToken: string,
    eventID: string
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
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixProduct[]>;
  fetchEvent(
    orgUrl: string,
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixEvent>;
  fetchEventCheckinLists(
    orgUrl: string,
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixCheckinList[]>;
  fetchEventSettings(
    orgUrl: string,
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixEventSettings>;
  fetchProductCategories(
    orgUrl: string,
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixProductCategory[]>;
  fetchAllEvents(orgUrl: string, token: string): Promise<GenericPretixEvent[]>;
  /**
   * It would probably be good practice to have some sort of lock on the act
   * of checking in a generic issuance ticket for a particular external event id.
   * We do not want to introduce surface area for double-spend.
   */
  pushCheckin(
    orgUrl: string,
    pretixToken: string,
    positionSecret: string,
    checkinListId: string,
    timestamp: string
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
    init?: RequestInit
  ): Promise<Response> {
    // Set up an abort controller for this request. This is used to cancel
    // pending requests, e.g. during app shutdown.
    const abortController = new AbortController();
    const abortHandler = (): void => {
      abortController.abort();
    };

    // Trigger the abort signal if our main "cancel" controller fires.
    this.cancelController.signal.addEventListener("abort", abortHandler);

    return this.requestQueue.add(async () => {
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
        this.cancelController.signal.removeEventListener("abort", abortHandler);
      }
    });
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
    token: string
  ): Promise<GenericPretixEvent[]> {
    return traced(TRACE_SERVICE, "fetchAllEvents", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const events: GenericPretixEvent[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events`;
      while (url != null) {
        logger(`[GENERIC PRETIX] Fetching events: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
          headers: { Authorization: `Token ${token}` }
        });
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
    eventID: string
  ): Promise<GenericPretixEvent> {
    return traced(TRACE_SERVICE, "fetchEvent", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event API
      const url = `${orgUrl}/events/${eventID}/`;
      logger(`[GENERIC PRETIX] Fetching event: ${url}`);
      const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
        headers: { Authorization: `Token ${token}` }
      });
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
    eventID: string
  ): Promise<GenericPretixEventSettings> {
    return traced(TRACE_SERVICE, "fetchEventSettings", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      // Fetch event settings API
      const url = `${orgUrl}/events/${eventID}/settings`;
      logger(`[GENERIC PRETIX] Fetching event settings: ${url}`);
      const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
        headers: { Authorization: `Token ${token}` }
      });
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
    pretixApiToken: string,
    eventID: string
  ): Promise<GenericPretixProductCategory[]> {
    return traced(TRACE_SERVICE, "fetchAddons", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const categories: GenericPretixProductCategory[] = [];

      // Fetch categories from paginated API
      let url = `${orgUrl}/events/${eventID}/categories/`;
      while (url != null) {
        logger(`[GENERIC PRETIX] Fetching categories: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
          headers: { Authorization: `Token ${pretixApiToken}` }
        });
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
    pretixApiToken: string,
    eventID: string
  ): Promise<GenericPretixProduct[]> {
    return traced(TRACE_SERVICE, "fetchItems", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const items: GenericPretixProduct[] = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/items/`;
      while (url != null) {
        logger(`[GENERIC PRETIX] Fetching items: ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
          headers: { Authorization: `Token ${pretixApiToken}` }
        });
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
    pretixApiToken: string,
    eventID: string
  ): Promise<GenericPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const orders = [];

      // Fetch orders from paginated API
      let url = `${orgUrl}/events/${eventID}/orders/`;
      while (url != null) {
        logger(`[GENERIC PRETIX] Fetching orders ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
          headers: { Authorization: `Token ${pretixApiToken}` }
        });
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

  // TODO: @rob - what's your best description of what's going on here?
  public async fetchEventCheckinLists(
    orgUrl: string,
    pretixToken: string,
    eventID: string
  ): Promise<GenericPretixCheckinList[]> {
    return traced(TRACE_SERVICE, "fetchOrders", async (span) => {
      span?.setAttribute("org_url", orgUrl);
      const lists: GenericPretixCheckinList[] = [];

      // Fetch check-in lists from paginated API
      let url = `${orgUrl}/events/${eventID}/checkinlists/`;
      while (url != null) {
        logger(`[GENERIC PRETIX] Fetching orders ${url}`);
        const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
          headers: { Authorization: `Token ${pretixToken}` }
        });
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
    pretixToken: string,
    positionSecret: string,
    checkinListId: string,
    timestamp: string
  ): Promise<void> {
    return traced(TRACE_SERVICE, "pushCheckin", async (span) => {
      span?.setAttribute("org_url", orgUrl);

      const url = `${orgUrl}/checkinrpc/redeem/`;

      const res = await this.getOrCreateQueue(orgUrl).fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${pretixToken}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          secret: positionSecret,
          lists: [checkinListId],
          datetime: timestamp
        })
      });

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

/**
 * Return an English-language string if one exists, otherwise the first
 */
export function getI18nString(map: GenericPretixI18nMap): string {
  return map["en"] ?? Object.values(map)[0];
}

/**
 * Pretix API types
 *
 * A Zod schema is used to ensure that the data has the expected form.
 * Clients may do additional validation, for instance to ensure that events
 * have the expected products, or that event settings match those that we
 * require. Those checks are not part of the schema.
 *
 * The comments below are copied from the original Devconnect Pretix API
 * client.
 */

const GenericPretixI18MapSchema = z.record(z.string());

// This records when an attendee was checked in
const GenericPretixCheckinSchema = z.object({
  datetime: z.string(),
  type: z.enum(["entry", "exit"])
});

// Unclear why this is called a "position" rather than a ticket.
const GenericPretixPositionSchema = z.object({
  id: z.number(),
  order: z.string(), // "Q0BHN"
  positionid: z.number(),
  item: z.number(),
  price: z.string(),
  attendee_name: z.string(), // first and last
  attendee_email: z.string().toLowerCase().trim().nullable(),
  subevent: z.number().nullable(),
  secret: z.string(),
  checkins: z.array(GenericPretixCheckinSchema)
});

// A Pretix order. For our purposes, each order contains one ticket.
const GenericPretixOrderSchema = z.object({
  code: z.string(), // "Q0BHN"
  status: z.string(), // "p"
  testmode: z.boolean(),
  secret: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().toLowerCase().trim(),
  positions: z.array(GenericPretixPositionSchema) // should have exactly one
});

const GenericPretixProductSchema = z.object({
  id: z.number(), // corresponds to "item" field in GenericPretixPosition
  category: z.number().optional().nullable(),
  admission: z.boolean(),
  personalized: z.boolean(),
  generate_tickets: z.boolean().nullable().optional(),
  name: GenericPretixI18MapSchema
});

const GenericPretixEventSchema = z.object({
  slug: z.string(), // corresponds to "event_id" field in our db
  name: GenericPretixI18MapSchema
});

// TODO: @rob @richard @josh - can we do a pretix settings scan?
const GenericPretixEventSettingsSchema = z.object({
  // These settings control whether individual attendees must have
  // email addresses specified.
  // Corresponds to the "Ask for email addresses per ticket" setting
  // in the "Customer and attendee data" section of event settings
  // in the Pretix UI.
  attendee_emails_asked: z.boolean(),
  attendee_emails_required: z.boolean()
});

// @rob - what are product categories?
const GenericPretixProductCategorySchema = z.object({
  id: z.number(),
  is_addon: z.boolean()
  // @rob - should we load category names?
});

// Each event has one or more check-in lists
// We only care about these because we need the list ID for check-in sync
const GenericPretixCheckinListSchema = z.object({
  id: z.number(),
  name: z.string()
});

export type GenericPretixI18nMap = z.infer<typeof GenericPretixI18MapSchema>;
export type GenericPretixOrder = z.infer<typeof GenericPretixOrderSchema>;
export type GenericPretixProduct = z.infer<typeof GenericPretixProductSchema>;
export type GenericPretixEvent = z.infer<typeof GenericPretixEventSchema>;
export type GenericPretixEventSettings = z.infer<
  typeof GenericPretixEventSettingsSchema
>;
export type GenericPretixProductCategory = z.infer<
  typeof GenericPretixProductCategorySchema
>;
export type GenericPretixCheckinList = z.infer<
  typeof GenericPretixCheckinListSchema
>;
export type GenericPretixCheckin = z.infer<typeof GenericPretixCheckinSchema>;
export type GenericPretixPosition = z.infer<typeof GenericPretixPositionSchema>;
