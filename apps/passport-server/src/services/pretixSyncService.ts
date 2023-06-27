import { DateRange } from "@pcd/passport-interface";

import { PoolClient } from "pg";
import {
  fetchOrders,
  fetchSubevents,
  getPretixConfig,
  PretixConfig,
  PretixOrder,
  PretixSubevent,
} from "../apis/pretixAPI";
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
import { traced } from "./telemetryService";

const TRACE_SERVICE = "Pretix";

/**
 * Kick off a period sync from Preticx into Zupass.
 */
export function startPretixSync(context: ApplicationContext) {
  const pretixConfig = getPretixConfig();
  if (pretixConfig == null) return;
  console.log("[PRETIX] Starting Pretix sync: " + JSON.stringify(pretixConfig));
  trySync(pretixConfig);
  async function trySync(config: PretixConfig) {
    try {
      await sync(context, config);
    } catch (e: any) {
      context.rollbar?.error(e);
      console.error(e);
    }
    setTimeout(() => trySync(config), 1000 * 60);
  }
}

/**
 * Synchronize Pretix state with Zupass state.
 */
async function sync(context: ApplicationContext, pretixConfig: PretixConfig) {
  return traced(TRACE_SERVICE, "sync", async () => {
    const syncStart = Date.now();
    console.log("[PRETIX] Sync start");
    const participants = await loadAllParticipants(pretixConfig);
    const participantEmails = new Set(participants.map((p) => p.email));

    console.log(
      `[PRETIX] loaded ${participants.length} Pretix participants (visitors, residents, and organizers)` +
        ` from Pretix, found ${participantEmails.size} unique emails`
    );

    const { dbPool } = context;
    const dbClient = await dbPool.connect();

    try {
      await saveParticipants(dbClient, participants);
    } finally {
      dbClient.release();
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
async function saveParticipants(
  dbClient: PoolClient,
  pretixParticipants: PretixParticipant[]
) {
  return traced(TRACE_SERVICE, "saveParticipants", async (span) => {
    const pretixParticipantsAsMap = participantsToMap(pretixParticipants);
    const existingParticipants = await fetchPretixParticipants(dbClient);
    const existingParticipantsByEmail = participantsToMap(existingParticipants);
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
    console.log(`[PRETIX] Updating ${updatedParticipants.length} participants`);
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
    console.log(`[PRETIX] Deleting ${removedParticipants.length} participants`);
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
async function loadAllParticipants(
  pretixConfig: PretixConfig
): Promise<PretixParticipant[]> {
  return traced(TRACE_SERVICE, "loadAllParticipants", async () => {
    console.log(
      "[PRETIX] Fetching participants (visitors, residents, organizers)"
    );

    const residents = await loadResidents(pretixConfig);
    const visitors = await loadVisitors(pretixConfig);

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
async function loadResidents(
  pretixConfig: PretixConfig
): Promise<PretixParticipant[]> {
  return traced(TRACE_SERVICE, "loadResidents", async () => {
    console.log("[PRETIX] Fetching residents");

    // Fetch orders
    const orders = await fetchOrders(pretixConfig, pretixConfig.zuEventID);

    // Extract organizers
    const orgOrders = orders.filter(
      (o) => o.positions[0].item === pretixConfig.zuEventOrganizersItemID
    );
    console.log(
      `[PRETIX] ${orgOrders.length} organizer / ${orders.length} total resident orders`
    );
    const organizers = ordersToParticipants(
      orgOrders,
      [],
      ParticipantRole.Organizer
    );
    const orgEmails = new Set(organizers.map((p) => p.email));

    // Extract other residents
    const residents = ordersToParticipants(
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
async function loadVisitors(
  pretixConfig: PretixConfig
): Promise<PretixParticipant[]> {
  return traced(TRACE_SERVICE, "loadVisitors", async () => {
    console.log("[PRETIX] Fetching visitors");
    const subevents = await fetchSubevents(
      pretixConfig,
      pretixConfig.zuVisitorEventID
    );

    const visitorOrders = await fetchOrders(
      pretixConfig,
      pretixConfig.zuVisitorEventID
    );

    const visitorParticipants = ordersToParticipants(
      visitorOrders,
      subevents,
      ParticipantRole.Visitor
    );

    const visitors = deduplicateVisitorParticipants(visitorParticipants);

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
function ordersToParticipants(
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
function deduplicateVisitorParticipants(
  visitors: PretixParticipant[]
): PretixParticipant[] {
  const dedupedVisitors: Map<string /* email */, PretixParticipant> = new Map();

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
