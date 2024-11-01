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
import { toError } from "@pcd/util";
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
    batch: boolean,
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
  maxRequestsPerMinute?: number;
  maxConcurrency?: number;
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
  private readonly interval = 60_000;
  private readonly maxConcurrentRequests: number;
  private readonly intervalCap: number;
  private cancelController: AbortController;
  private requestQueue: PQueue;

  public constructor(
    options: Required<GenericPretixAPIOptions>,
    cancelController: AbortController,
    onIdle: () => void
  ) {
    this.intervalCap = options.maxRequestsPerMinute;
    this.maxConcurrentRequests = options.maxConcurrency;
    this.cancelController = cancelController;
    this.requestQueue = new PQueue({
      interval: this.interval,
      concurrency: this.maxConcurrentRequests,
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

  private readonly defaultMaxRequestsPerMinute = 100;
  private readonly defaultMaxConcurrentRequests = 1;

  private readonly batchedMaxRequestsPerMinute = 200;
  private readonly batchedMaxConcurrentRequests = 30;

  private organizerQueues: Record<string, OrganizerRequestQueue>;

  public constructor() {
    this.organizerQueues = {};
    this.cancelController = this.newCancelController();
  }

  private newCancelController(): AbortController {
    const ac = new AbortController();
    setMaxListeners(1000, ac.signal);
    return ac;
  }

  public cancelPendingRequests(): void {
    this.cancelController.abort();
    this.cancelController = this.newCancelController();
  }

  /**
   * Check if batching is enabled for a given organizer. Enabled by the
   * `PRETIX_BATCH_ENABLED_FOR` environment variable. See
   * `apps/passport-server/.env.example` for more details.
   */
  private isBatchingEnabled(orgUrl: string): boolean {
    try {
      const enabledFor = JSON.parse(
        process.env.PRETIX_BATCH_ENABLED_FOR ?? "[]"
      );
      return enabledFor instanceof Array && enabledFor.includes(orgUrl);
    } catch (e) {
      logger(
        `[GENERIC PRETIX] Error checking if batching is enabled for ${orgUrl}`,
        e
      );
      return false;
    }
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
      const batchingEnabled = this.isBatchingEnabled(orgUrl);

      queue = new OrganizerRequestQueue(
        {
          maxRequestsPerMinute: batchingEnabled
            ? this.batchedMaxRequestsPerMinute
            : this.defaultMaxRequestsPerMinute,
          maxConcurrency: batchingEnabled
            ? this.batchedMaxConcurrentRequests
            : this.defaultMaxConcurrentRequests
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

  // Fetch all orders for a given event in parallel batches, which is faster
  // than fetching them sequentially.
  private async fetchOrdersParallelBatch(
    orgUrl: string,
    token: string,
    eventID: string,
    abortController?: AbortController
  ): Promise<GenericPretixOrder[]> {
    return traced(TRACE_SERVICE, "fetchOrdersParallelBatch", async (span) => {
      /**
       * This type is only relevant internally to this function. It represents a
       * response by the Pretix API to a request for a page of orders in a particular event.
       */
      type PageResult =
        | {
            orders: GenericPretixOrder[];
            error?: never;
            reachedEnd?: never;
          }
        | {
            orders?: never;
            error: Error;
            reachedEnd?: never;
          }
        | {
            orders?: never;
            error?: never;
            reachedEnd: true;
          };

      /**
       * An 'actual error' is an error that is *NOT* due to reaching the end of
       * the list of orders. I.e. a 404 error for the first page, or *ANY* other
       * error for any other page.
       */
      function findActualErrors(pageResults: PageResult[]): PageResult[] {
        return pageResults.filter((pageResult) => pageResult.error);
      }

      /**
       * We 'reached the end' when we get a 404 on a request for a page of orders
       * that is not the first page. We've not reached the end successfully if there
       * is an 'actual error', as defined by the implementation of {@link findActualErrors}.
       */
      function reachedEnd(pageResults: PageResult[]): boolean {
        if (findActualErrors(pageResults).length !== 0) {
          return false;
        }

        return pageResults.some((pageResult) => pageResult.reachedEnd);
      }

      /**
       * The quantity of pages of orders to fetch in parallel in a single 'batch'.
       */
      const batchSize = 30;

      /**
       * The maximum page index that this batch loading mechanism will fetch. It's intended
       * to prevent infinite loops in case of bugs in the Pretix API or this code.
       */
      const maxPages = 1000;

      const orders: GenericPretixOrder[] = [];
      let cursor = 0;

      span?.setAttribute("org_url", orgUrl);

      // to prevent infinite loops, limit the number of pages we fetch to `maxPages`
      while (cursor < maxPages - batchSize) {
        const pageIndexes = new Array(batchSize)
          .fill(0)
          .map((_, i) => i + cursor);

        // for each page index, load that page. none of these promises should throw,
        // the page load result state is encapsulated in the `PageResult` type, which is
        // why we can use `Promise.all` here.
        const batchOfPages = await Promise.all(
          pageIndexes.map(async (pageIndex): Promise<PageResult> => {
            try {
              const pageUrl =
                `${orgUrl}/events/${eventID}/orders/` +
                (pageIndex > 0 ? `?page=${pageIndex}` : "");

              logger(`[GENERIC PRETIX] Fetching orders ${pageUrl}`);

              const res = await this.getOrCreateQueue(orgUrl).fetch(
                pageUrl,
                {
                  headers: { Authorization: `Token ${token}` }
                },
                0,
                abortController
              );

              // an error could be legitimate, or because we've reached the end of the set of orders.
              if (!res.ok) {
                // if we get a 404 for anything other than the first page, that is ok, since that means
                // we've reached the end of the list of orders.
                if (res.status === 404 && pageIndex !== 0) {
                  return {
                    reachedEnd: true
                  };
                }
                // otherwise, all other errors are actual errors
                else {
                  return {
                    error: new Error(
                      `[GENERIC PRETIX] Error fetching ${pageUrl}: ${res.status} ${res.statusText}`
                    )
                  };
                }
              }

              const page = await res.json();
              const results = z
                .array(GenericPretixOrderSchema)
                .safeParse(page.results);

              // the page must parse successfully - incorrectly formatted responses are considered
              // to be 'real' errors.
              if (results.success) {
                return {
                  orders: results.data
                };
              } else {
                return {
                  error: new Error(
                    `[GENERIC PRETIX] Error parsing response from ${pageUrl}: ${results.error.message}`
                  )
                };
              }
            } catch (e) {
              return {
                error: toError(e)
              };
            }
          })
        );

        const fetchedOrdersInBatch: GenericPretixOrder[] = batchOfPages
          .map((result) => result.orders ?? [])
          .flat();

        orders.push(...fetchedOrdersInBatch);

        const actualErrors = findActualErrors(batchOfPages);

        // an actual error happens when we get an error other than a 404 on fetching a page
        // of orders, or when we get a 404 response to a request for the first page. If we have
        // an actual error, we throw it.
        if (actualErrors.length !== 0) {
          throw actualErrors[0].error;
        }
        // if we haven't encountered a real error yet, and also haven't reached the end of
        // the set of pages of orders, then we increment the cursor and continue in this loop
        // to fetch the next batch of pages.
        else if (!reachedEnd(batchOfPages)) {
          cursor += batchSize;
          continue;
        }
        // otherwise, if we haven't encountered a real error, and we've 'reached the end' of the
        // list of pages of orders, then we are done fetching all the orders, and we break
        // out of the loop.
        else {
          break;
        }
      }

      return orders;
    });
  }

  // Fetch all orders for a given event.
  public async fetchOrders(
    orgUrl: string,
    token: string,
    eventID: string,
    batch: boolean,
    abortController?: AbortController
  ): Promise<GenericPretixOrder[]> {
    if (batch && this.isBatchingEnabled(orgUrl)) {
      return this.fetchOrdersParallelBatch(
        orgUrl,
        token,
        eventID,
        abortController
      );
    }

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
