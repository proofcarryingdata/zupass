import { PoolClient } from "pg";
import { ParticipantRole, PretixParticipant } from "../database/models";
import { fetchParticipantEmails } from "../database/queries/fetchParticipantEmails";
import { insertParticipant } from "../database/queries/insertParticipant";
import { updateParticipant } from "../database/queries/updateParticipant";
import { ApplicationContext } from "../types";
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
      visitorEventID: requireEnv("PRETIX_VISITOR_EVENT_ID"),
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

interface PretixConfig {
  token: string;
  orgUrl: string;
  zuEventID: string;
  visitorEventID: string;
  zuEventOrganizersItemID: number;
}

// Fetch tickets from Pretix, save to DB.
async function sync(context: ApplicationContext, pretixConfig: PretixConfig) {
  // Load from pretix
  const participants = await loadAllParticipants(pretixConfig);
  const participantEmails = new Set(participants.map((p) => p.email));
  console.log(
    `[PRETIX] loaded ${participants.length} Pretix participants, ${participantEmails.size} unique emails`
  );

  // Save to DB
  const { dbPool } = context;
  const dbClient = await dbPool.connect();
  try {
    await saveParticipants(dbClient, participants);
  } finally {
    dbClient.release();
  }
}

// Insert new participants into the database.
// Update role of existing participants.
// TODO: handle revoked/cancelled tickets.
async function saveParticipants(
  dbClient: PoolClient,
  participants: PretixParticipant[]
) {
  // Query database to see what's changed
  const existingPs = await fetchParticipantEmails(dbClient);
  const existingMap = new Map(existingPs.map((p) => [p.email, p.role]));

  // Insert new participants
  const newParticipants = participants.filter((p) => !existingMap.has(p.email));
  console.log(`[PRETIX] Inserting ${newParticipants.length} new participants`);
  for (const p of newParticipants) {
    console.log(`[PRETIX] Inserting ${p.email} ${p.name} ${p.role}`);
    await insertParticipant(dbClient, p);
  }

  // Update role on existing participants
  const updatedParticipants = participants
    .filter((p) => existingMap.has(p.email))
    .filter((p) => existingMap.get(p.email) !== p.role);
  for (const p of updatedParticipants) {
    const oldRole = existingMap.get(p.email);
    console.log(
      `[PRETIX] Updating ${p.email} ${p.name} from ${oldRole} to ${p.role}`
    );
    await updateParticipant(dbClient, p);
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
  const organizers = ordersToParticipants(orgOrders, ParticipantRole.Organizer);
  const orgEmails = new Set(organizers.map((p) => p.email));

  // Extract other residents
  const residents = ordersToParticipants(
    orders,
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
  const subEvents = await fetchSubEvents(pretixConfig);

  const subEventOrders = [];
  for (const event of subEvents) {
    const participants = await fetchOrders(pretixConfig, event.slug);
    subEventOrders.push(...participants);
  }
  console.log(`[PRETIX] loaded ${subEventOrders.length} visitor orders`);

  const subEventParticipants = ordersToParticipants(
    subEventOrders,
    ParticipantRole.Visitor
  );

  const residentEmails = new Set(residents.map((p) => p.email));
  const visitors = subEventParticipants.filter(
    (p) => !residentEmails.has(p.email)
  );
  console.log(`[PRETIX] loaded ${visitors.length} visitors`);

  return visitors;
}

/**
 * Converts a given list of orders to participants, and sets
 * all of their roles to equal the given role.
 */
function ordersToParticipants(
  orders: PretixOrder[],
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
    .map((o) => ({
      role,
      email: (o.email || o.positions[0].attendee_email).toLowerCase(),
      name: o.positions[0].attendee_name,
      residence: "", // TODO: not in pretix yet
      order_id: o.code,
      email_token: "",
    }));

  return participants;
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

/**
 * Loads details for all events that are *not* the main Zuzalu event.
 */
async function fetchSubEvents(
  pretixConfig: PretixConfig
): Promise<PretixEvent[]> {
  const events: PretixEvent[] = [];

  // Fetch orders from paginated API
  let url = `${pretixConfig.orgUrl}/events`;
  while (url != null) {
    console.log(`[PRETIX] Fetching ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${pretixConfig.token}`,
      },
    });
    if (!res.ok) {
      console.error(
        `[PRETIX] Error fetching ${url}: ${res.status} ${res.statusText}`
      );
      break;
    }
    const page = await res.json();
    events.push(...page.results);
    url = page.next;
  }

  return events.filter((e) => e.slug !== pretixConfig.zuEventID);
}

interface PretixEvent {
  /**
   * Unique identifier for a Pretix event.
   */
  slug: string;

  // This type actually has more stuff, but the only
  // relevant one is `slug`.
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
}
