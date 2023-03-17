import { ZuParticipant } from "@pcd/passport-interface";
import {
  fetchParticipantEmails,
  insertParticipants,
} from "../database/queries";
import { ApplicationContext } from "../types";

// Periodically try to sync Zuzalu residents and visitors from Pretix.
export function startPretixSync(context: ApplicationContext) {
  const { dbClient, honeyClient } = context;

  // Make sure we can use the Pretix API.
  const pretixConfig: PretixConfig = {
    token: requireEnv("PRETIX_TOKEN"),
    orgUrl: requireEnv("PRETIX_ORG_URL"),
    zuEventID: requireEnv("PRETIX_ZU_EVENT_ID"),
  };

  // Sync periodically.
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
  const { dbClient, honeyClient } = context;

  // Load from Pretix, filter to valid tickets.
  const orders = await fetchOrders(pretixConfig, pretixConfig.zuEventID);
  console.log(`Fetched ${orders.length} orders`);

  const participants: ZuParticipant[] = orders
    .filter((o) => o.status === "p")
    .filter((o) => o.positions.length === 1)
    .filter((o) => o.email !== "" && o.positions[0].attendee_name !== "")
    .map((o) => ({
      role: "resident",
      email: o.email,
      name: o.positions[0].attendee_name,
      residence: "", // TODO: not in pretix yet
      commitment: "",
    }));
  console.log(`Found ${participants.length} participants`);

  // Insert into database.
  const existingEmails = await fetchParticipantEmails(dbClient);
  const existingSet = new Set(existingEmails.map((e) => e.email));
  const newParticipants = participants.filter((p) => !existingSet.has(p.email));

  console.log(`Inserting ${newParticipants.length} new participants`);
  for (const p of newParticipants) {
    console.log(`Inserting ${p.email} ${p.name} ${p.role}`);
    await insertParticipants(dbClient, p);
  }
}

// Fetch all orders for a given event.
async function fetchOrders(pretixConfig: PretixConfig, eventID: string) {
  const orders: PretixOrder[] = [];

  // Fetch orders from paginated API
  let url = `${pretixConfig.orgUrl}/events/${eventID}/orders/`;
  while (url != null) {
    console.log(`Fetching ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Token ${pretixConfig.token}`,
      },
    });
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
}

function requireEnv(str: string): string {
  const val = process.env[str];
  if (val == null || val === "") {
    throw new Error(`Missing ${str}`);
  }
  return val;
}
