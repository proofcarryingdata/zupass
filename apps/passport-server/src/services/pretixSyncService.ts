import { DateRange } from "@pcd/passport-interface";

import { ClientBase, Pool } from "pg";
import { IPretixAPI, PretixOrder, PretixSubevent } from "../apis/pretixAPI";
import { ParticipantRole, PretixParticipant } from "../database/models";
import { deletePretixParticipant } from "../database/queries/pretix_users/deleteParticipant";
import { fetchPretixParticipants } from "../database/queries/pretix_users/fetchPretixParticipants";
import { insertPretixParticipant } from "../database/queries/pretix_users/insertParticipant";
import { updateParticipant } from "../database/queries/pretix_users/updateParticipant";
import { ApplicationContext } from "../types";
import {
  participantsToMap,
  participantUpdatedFromPretix,
} from "../util/participant";
import { RollbarService } from "./rollbarService";
import { traced } from "./telemetryService";

const TRACE_SERVICE = "Pretix";

export class PretixSyncService {
  private pretixAPI: IPretixAPI;
  private rollbarService: RollbarService;
  private context: ApplicationContext;
  private timeout: NodeJS.Timeout | undefined;
  private _hasCompletedSyncSinceStarting: boolean;

  public get hasCompletedSyncSinceStarting() {
    return this._hasCompletedSyncSinceStarting;
  }

  public constructor(
    context: ApplicationContext,
    pretixAPI: IPretixAPI,
    rollbarService: RollbarService
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
    this.pretixAPI = pretixAPI;
    this._hasCompletedSyncSinceStarting = false;
  }

  public startSyncLoop() {
    const trySync = async () => {
      try {
        await this.sync();
      } catch (e: any) {
        this.rollbarService?.error(e);
        console.error(e);
      }
      this.timeout = setTimeout(() => trySync(), 1000 * 60);
    };

    trySync();
  }

  public stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  /**
   * Synchronize Pretix state with Zupass state.
   */
  async sync() {
    return traced(TRACE_SERVICE, "sync", async () => {
      const syncStart = Date.now();
      console.log("[PRETIX] Sync start");
      const participants = await this.loadAllParticipants();
      const participantEmails = new Set(participants.map((p) => p.email));

      console.log(
        `[PRETIX] loaded ${participants.length} Pretix participants (visitors, residents, and organizers)` +
          ` from Pretix, found ${participantEmails.size} unique emails`
      );

      const { dbPool } = this.context;

      try {
        await this.saveParticipants(dbPool, participants);
      } catch (e) {
        console.log("[PRETIX] failed to save participants");
      }

      const syncEnd = Date.now();
      console.log(
        `[PRETIX] Sync end. Completed in ${Math.floor(
          (syncEnd - syncStart) / 1000
        )} seconds`
      );
    });
  }

  /**
   * - Insert new participants into the database.
   * - Update role and visitor dates of existing participants, if they
   *   been changed.
   * - Delete participants that are no longer residents.
   */
  async saveParticipants(
    dbClient: ClientBase | Pool,
    pretixParticipants: PretixParticipant[]
  ) {
    return traced(TRACE_SERVICE, "saveParticipants", async (span) => {
      const pretixParticipantsAsMap = participantsToMap(pretixParticipants);
      const existingParticipants = await fetchPretixParticipants(dbClient);
      const existingParticipantsByEmail =
        participantsToMap(existingParticipants);
      const newParticipants = pretixParticipants.filter(
        (p) => !existingParticipantsByEmail.has(p.email)
      );

      // Step 1 of saving: insert participants that are new
      console.log(
        `[PRETIX] Inserting ${newParticipants.length} new participants`
      );
      for (const participant of newParticipants) {
        console.log(`[PRETIX] Inserting ${JSON.stringify(participant)}`);
        await insertPretixParticipant(dbClient, participant);
      }

      // Step 2 of saving: update participants that have changed
      // Filter to participants that existed before, and filter to those that have changed.
      const updatedParticipants = pretixParticipants
        .filter((p) => existingParticipantsByEmail.has(p.email))
        .filter((p) => {
          const oldParticipant = existingParticipantsByEmail.get(p.email)!;
          const newParticipant = p;
          return participantUpdatedFromPretix(oldParticipant, newParticipant);
        });

      // For the participants that have changed, update them in the database.
      console.log(
        `[PRETIX] Updating ${updatedParticipants.length} participants`
      );
      for (const updatedParticipant of updatedParticipants) {
        const oldParticipant = existingParticipantsByEmail.get(
          updatedParticipant.email
        );
        console.log(
          `[PRETIX] Updating ${JSON.stringify(
            oldParticipant
          )} to ${JSON.stringify(updatedParticipant)}`
        );
        await updateParticipant(dbClient, updatedParticipant);
      }

      // Step 3 of saving: remove participants that don't exist in Pretix, but do
      // exist in our database.
      const removedParticipants = existingParticipants.filter(
        (existing) => !pretixParticipantsAsMap.has(existing.email)
      );
      console.log(
        `[PRETIX] Deleting ${removedParticipants.length} participants`
      );
      for (const removedParticipant of removedParticipants) {
        console.log(`[PRETIX] Deleting ${JSON.stringify(removedParticipant)}`);
        await deletePretixParticipant(dbClient, removedParticipant.email);
      }

      span?.setAttribute("participantsInserted", newParticipants.length);
      span?.setAttribute("participantsUpdated", updatedParticipants.length);
      span?.setAttribute("participantsDeleted", removedParticipants.length);
      span?.setAttribute(
        "participantsTotal",
        existingParticipants.length +
          newParticipants.length -
          removedParticipants.length
      );
    });
  }

  /**
   * Downloads the complete list of both visitors and residents from Pretix.
   */
  async loadAllParticipants(): Promise<PretixParticipant[]> {
    return traced(TRACE_SERVICE, "loadAllParticipants", async () => {
      console.log(
        "[PRETIX] Fetching participants (visitors, residents, organizers)"
      );

      const residents = await this.loadResidents();
      const visitors = await this.loadVisitors();

      const residentsAsMap = participantsToMap(residents);
      const nonResidentVisitors = visitors.filter(
        (v) => !residentsAsMap.has(v.email)
      );

      return [...residents, ...nonResidentVisitors];
    });
  }

  /**
   * Loads those participants who are residents or organizers (not visitors) of Zuzalu.
   */
  async loadResidents(): Promise<PretixParticipant[]> {
    return traced(TRACE_SERVICE, "loadResidents", async () => {
      console.log("[PRETIX] Fetching residents");

      // Fetch orders
      const orders = await this.pretixAPI.fetchOrders(
        this.pretixAPI.config.zuEventID
      );

      // Extract organizers
      const orgOrders = orders.filter(
        (o) =>
          o.positions[0].item === this.pretixAPI.config.zuEventOrganizersItemID
      );
      console.log(
        `[PRETIX] ${orgOrders.length} organizer / ${orders.length} total resident orders`
      );
      const organizers = this.ordersToParticipants(
        orgOrders,
        [],
        ParticipantRole.Organizer
      );
      const orgEmails = new Set(organizers.map((p) => p.email));

      // Extract other residents
      const residents = this.ordersToParticipants(
        orders,
        [],
        ParticipantRole.Resident
      ).filter((p) => !orgEmails.has(p.email));

      // Return the combined list
      console.log(
        `[PRETIX] loaded ${organizers.length} organizers, ${residents.length} residents`
      );
      return [...organizers, ...residents];
    });
  }

  /**
   * Loads all visitors of Zuzalu. Visitors are defined as participants
   * who are not members of the main Zuzalu event in pretix.
   */
  async loadVisitors(): Promise<PretixParticipant[]> {
    return traced(TRACE_SERVICE, "loadVisitors", async () => {
      console.log("[PRETIX] Fetching visitors");
      const subevents = await this.pretixAPI.fetchSubevents(
        this.pretixAPI.config.zuVisitorEventID
      );
      const visitorOrders = await this.pretixAPI.fetchOrders(
        this.pretixAPI.config.zuVisitorEventID
      );

      const visitorParticipants = this.ordersToParticipants(
        visitorOrders,
        subevents,
        ParticipantRole.Visitor
      );

      const visitors = this.deduplicateVisitorParticipants(visitorParticipants);

      console.log(`[PRETIX] loaded ${visitors.length} visitors`);

      return visitors;
    });
  }

  /**
   * Converts a given list of orders to participants, and sets
   * all of their roles to equal the given role. When `subEvents`
   * is passed in as a parameter, cross-reference them with the
   * orders, and set the visitor date ranges for the new
   * `PretixParticipant` to equal to the date ranges of the visitor
   * subevent events they have in their order.
   */
  ordersToParticipants(
    orders: PretixOrder[],
    visitorSubEvents: PretixSubevent[],
    role: ParticipantRole
  ): PretixParticipant[] {
    const participants: PretixParticipant[] = orders
      // check that they paid
      .filter((o) => o.status === "p")
      // an order can have more than one "position" (ticket)
      // for visitor orders--eg, paying for 3 individual 1-week tickets
      .filter((o) => o.positions.length >= 1)
      // check that they have an email and a name
      .filter((o) => !!o.positions[0].attendee_name)
      .filter((o) => !!(o.email || o.positions[0].attendee_email))
      .map((o) => {
        const orderSubevents = o.positions
          .map((position) => position.subevent)
          .map((positionSubeventId) =>
            visitorSubEvents.find(
              (subEvent) => subEvent.id === positionSubeventId
            )
          )
          .filter((subEvent) => subEvent != null);

        const visitorDateRanges = orderSubevents.map(
          (subEvent) =>
            ({
              date_from: subEvent?.date_from,
              date_to: subEvent?.date_to,
            } satisfies DateRange)
        );

        return {
          role,
          email: (o.email || o.positions[0].attendee_email).toLowerCase(),
          name: o.positions[0].attendee_name,
          residence: "", // TODO: not in pretix yet
          order_id: o.code,
          visitor_date_ranges: visitorDateRanges,
        } satisfies PretixParticipant;
      });

    return participants;
  }

  /**
   * Some visitors have multiple orders. These orders need to be merged
   * into a single pretix participant zupass-side, so that a single user
   * on our end contains all the dates they have a visitor ticket to.
   */
  deduplicateVisitorParticipants(
    visitors: PretixParticipant[]
  ): PretixParticipant[] {
    const dedupedVisitors: Map<string /* email */, PretixParticipant> =
      new Map();

    for (const visitor of visitors) {
      const existingVisitor = dedupedVisitors.get(visitor.email);

      if (existingVisitor) {
        existingVisitor.visitor_date_ranges =
          existingVisitor.visitor_date_ranges ?? [];

        existingVisitor.visitor_date_ranges.push(
          ...(visitor.visitor_date_ranges ?? [])
        );
      } else {
        dedupedVisitors.set(visitor.email, visitor);
      }
    }

    return Array.from(dedupedVisitors.values());
  }
}
/**
 * Kick off a period sync from Pretix into Zupass.
 */
export function startPretixSyncService(
  context: ApplicationContext,
  rollbarService: RollbarService,
  pretixAPI: IPretixAPI | null
): PretixSyncService | null {
  if (!pretixAPI) {
    console.log("[PRETIX] can't start sync service - no api instantiated");
    return null;
  }

  const pretixSyncService = new PretixSyncService(
    context,
    pretixAPI,
    rollbarService
  );
  pretixSyncService.startSyncLoop();
  return pretixSyncService;
}
