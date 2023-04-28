import { DateRange } from "@pcd/passport-interface";
import { PoolClient } from "pg";
import { ParticipantRole, PretixParticipant } from "../database/models";
import { fetchPretixParticipants } from "../database/queries/fetchPretixParticipants";
import { insertParticipant } from "../database/queries/insertParticipant";
import { updateParticipant } from "../database/queries/updateParticipant";
import { ApplicationContext } from "../types";
import { participantUpdatedFromPretix } from "../util/participant";
import { requireEnv } from "../util/util";

// Periodically try to sync Zuzalu residents and visitors from Pretix.
export function startPretixSync(context: ApplicationContext) {
  // Make sure we can use the Pretix API.
  let pretixConfig: PretixConfig;
  try {
    pretixConfig = {
      token: requireEnv("PRETIX_TOKEN"),
      orgUrl: requireEnv("PRETIX_ORG_URL"),
      zuEventID: requireEnv("PRETIX_ZU_EVENT_ID"),
      zuVisitorEventID: requireEnv("PRETIX_VISITOR_EVENT_ID"),
      // See https://beta.ticketh.xyz/control/event/zuzalu/zuzalu/items/151/
      zuEventOrganizersItemID: 151,
    };
  } catch (e) {
    console.error(
      `[INIT] Missing environment variable ${e} - skipping starting Pretix sync`
    );
    return;
  }

  // Sync periodically.
  console.log("[PRETIX] Starting Pretix sync: " + JSON.stringify(pretixConfig));
  trySync();
  async function trySync() {
    try {
      await sync(context, pretixConfig);
    } catch (e: any) {
      context.rollbar?.error(e);
      console.error(e);
    }
    // TODO: write to honeycomb
    setTimeout(trySync, 1000 * 60);
  }
}

async function sync(context: ApplicationContext, pretixConfig: PretixConfig) {
  const participants = await loadAllParticipants(pretixConfig);
  const participantEmails = new Set(participants.map((p) => p.email));

  console.log(
    `[PRETIX] loaded ${participants.length} Pretix participants (visitors and residents) from Pretix, found ${participantEmails.size} unique emails`
  );

  const { dbPool } = context;
  const dbClient = await dbPool.connect();

  try {
    await saveParticipants(dbClient, participants);
  } finally {
    dbClient.release();
  }
}

/**
 * - Insert new participants into the database.
 * - Update role and visitor dates of existing participants, if they
 *   been changed.
 */
async function saveParticipants(
  dbClient: PoolClient,
  participants: PretixParticipant[]
) {
  const existingParticipants = await fetchPretixParticipants(dbClient);
  const existingParticipantsByEmail = new Map(
    existingParticipants.map((p) => [p.email, p])
  );
  const newParticipants = participants.filter(
    (p) => !existingParticipantsByEmail.has(p.email)
  );

  // Step 1 of saving: insert participants that are new
  console.log(`[PRETIX] Inserting ${newParticipants.length} new participants`);
  for (const participant of newParticipants) {
    console.log(`[PRETIX] Inserting ${JSON.stringify(participant)}`);
    await insertParticipant(dbClient, participant);
  }

  // Step 2 of saving: update participants that have changed
  // Filter to participants that existed before, and filter to those that have changed.
  const updatedParticipants = participants
    .filter((p) => existingParticipantsByEmail.has(p.email))
    .filter((p) => {
      const oldParticipant = existingParticipantsByEmail.get(p.email)!;
      const newParticipant = p;
      return participantUpdatedFromPretix(oldParticipant, newParticipant);
    });

  // For the participants that have changed, update them in the database.
  for (const updatedParticipant of updatedParticipants) {
    const oldParticipant = existingParticipantsByEmail.get(
      updatedParticipant.email
    );
    console.log(
      `[PRETIX] Updating ${JSON.stringify(oldParticipant)} to ${JSON.stringify(
        updatedParticipant
      )}`
    );
    await updateParticipant(dbClient, updatedParticipant);
  }
}

/**
 * Downloads the complete list of both visitors and residents from Pretix.
 */
async function loadAllParticipants(
  pretixConfig: PretixConfig
): Promise<PretixParticipant[]> {
  const residents = await loadResidents(pretixConfig);
  const visitors = await loadVisitors(pretixConfig, residents);
  return [...residents, ...visitors];
}

/**
 * Loads those participants who are residents (not visitors) of Zuzalu.
 */
async function loadResidents(
  pretixConfig: PretixConfig
): Promise<PretixParticipant[]> {
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
}

/**
 * Loads all visitors of Zuzalu. Visitors are defined as participants
 * who are not members of the main Zuzalu event in pretix.
 */
async function loadVisitors(
  pretixConfig: PretixConfig,
  residents: PretixParticipant[]
): Promise<PretixParticipant[]> {
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
}

/**
 * Converts a given list of orders to participants, and sets
 * all of their roles to equal the given role.
 */
function ordersToParticipants(
  orders: PretixOrder[],
  subEvents: PretixSubevent[],
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
          subEvents.find((subEvent) => subEvent.id === positionSubeventId)
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
        email_token: "",
        visitor_date_ranges: visitorDateRanges,
      } satisfies PretixParticipant;
    });

  return participants;
}

function deduplicateVisitorParticipants(
  visitors: PretixParticipant[]
): PretixParticipant[] {
  // email -> participant
  const dedupedVisitors: Map<string, PretixParticipant> = new Map();

  for (const visitor of visitors) {
    const existingVisitor = dedupedVisitors.get(visitor.email);

    if (existingVisitor) {
      existingVisitor.visitor_date_ranges =
        existingVisitor.visitor_date_ranges ?? [];

      existingVisitor.visitor_date_ranges.push(
        ...(visitor.visitor_date_ranges ?? [])
      );

      console.log(
        `[PRETIX] merging visitor ${visitor.email} to have ` +
          `${existingVisitor.visitor_date_ranges?.length} visitor date ranges`
      );
    } else {
      dedupedVisitors.set(visitor.email, visitor);
    }
  }

  return Array.from(dedupedVisitors.values());
}

// Fetch all orders for a given event.
async function fetchOrders(
  pretixConfig: PretixConfig,
  eventID: string
): Promise<PretixOrder[]> {
  const orders: PretixOrder[] = [];

  // Fetch orders from paginated API
  let url = `${pretixConfig.orgUrl}/events/${eventID}/orders/`;
  while (url != null) {
    console.log(`[PRETIX] Fetching ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: `Token ${pretixConfig.token}` },
    });
    if (!res.ok) {
      console.error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
      break;
    }
    const page = await res.json();
    orders.push(...page.results);
    url = page.next;
  }

  return orders;
}

// Fetch all item types for a given event.
async function fetchSubevents(
  pretixConfig: PretixConfig,
  eventID: string
): Promise<PretixSubevent[]> {
  const orders: PretixSubevent[] = [];

  // Fetch orders from paginated API
  let url = `${pretixConfig.orgUrl}/events/${eventID}/subevents/`;
  while (url != null) {
    console.log(`[PRETIX] Fetching ${url}`);
    const res = await fetch(url, {
      headers: { Authorization: `Token ${pretixConfig.token}` },
    });
    if (!res.ok) {
      console.error(`Error fetching ${url}: ${res.status} ${res.statusText}`);
      break;
    }
    const page = await res.json();
    orders.push(...page.results);
    url = page.next;
  }

  return orders;
}

// A Pretix order. For our purposes, each order contains one ticket.
interface PretixOrder {
  code: string; // "Q0BHN"
  status: string; // "p"
  testmode: boolean;
  secret: string;
  email: string;
  positions: PretixPosition[]; // should have exactly one
}

// Unclear why this is called a "position" rather than a ticket.
interface PretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // "Danilo Kim"
  attendee_email: string;
  subevent: number;
}

interface PretixSubevent {
  id: number;
  date_from?: string | null;
  date_to?: string | null;
}

interface PretixConfig {
  token: string;
  orgUrl: string;
  zuEventID: string;
  zuVisitorEventID: string;
  zuEventOrganizersItemID: number;
}
