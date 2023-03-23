import { ParticipantRole, PretixParticipant } from "../database/models";
import { fetchParticipantEmails } from "../database/queries/fetchParticipantEmails";
import { insertParticipants } from "../database/queries/writePretix";
import { ApplicationContext } from "../types";

// Periodically try to sync Zuzalu residents and visitors from Pretix.
export function startPretixSync(context: ApplicationContext) {
  // Make sure we can use the Pretix API.
  let pretixConfig: PretixConfig;
  try {
    pretixConfig = {
      token: requireEnv("PRETIX_TOKEN"),
      orgUrl: requireEnv("PRETIX_ORG_URL"),
      zuEventID: requireEnv("PRETIX_ZU_EVENT_ID"),
    };
  } catch (e) {
    console.error(e);
    console.error("[PRETIX] Missing Pretix config, skipping sync");
    return;
  }

  // Sync periodically.
  console.log("[PRETIX] Starting Pretix sync: " + JSON.stringify(pretixConfig));
  trySync();
  async function trySync() {
    try {
      await sync(context, pretixConfig);
    } catch (e) {
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
}

// Fetch tickets from Pretix. Insert new ones only into the database.
// TODO: handle revoked/cancelled tickets.
async function sync(context: ApplicationContext, pretixConfig: PretixConfig) {
  const { dbClient } = context;

  const participants = await loadAllParticipants(pretixConfig);

  // Insert into database.
  const existingSet = new Set(await fetchParticipantEmails(dbClient));
  const newParticipants = participants.filter((p) => !existingSet.has(p.email));

  console.log(`[PRETIX] Inserting ${newParticipants.length} new participants`);
  for (const p of newParticipants) {
    console.log(`[PRETIX] Inserting ${p.email} ${p.name} ${p.role}`);
    await insertParticipants(dbClient, p);
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
  const orders = await fetchOrders(pretixConfig, pretixConfig.zuEventID);
  const participants = ordersToParticipants(orders, ParticipantRole.Resident);
  console.log(`[PRETIX] loaded ${participants.length} residents`);
  return participants;
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
    // each order is supposed to have exactly one "position" (ticket)
    .filter((o) => o.positions.length === 1)
    // check that they have an email and a name
    .filter((o) => o.email !== "" && o.positions[0].attendee_name !== "")
    .map((o) => ({
      role,
      email: o.email,
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
      headers: {
        Authorization: `Token ${pretixConfig.token}`,
      },
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
}

function requireEnv(str: string): string {
  const val = process.env[str];
  if (val == null || val === "") {
    throw new Error(`Missing ${str}`);
  }
  return val;
}
