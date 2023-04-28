// Fetch all orders for a given event.
export async function fetchOrders(
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
export async function fetchSubevents(
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
export interface PretixOrder {
  code: string; // "Q0BHN"
  status: string; // "p"
  testmode: boolean;
  secret: string;
  email: string;
  positions: PretixPosition[]; // should have exactly one
}

// Unclear why this is called a "position" rather than a ticket.
export interface PretixPosition {
  id: number;
  order: string; // "Q0BHN"
  positionid: number;
  item: number;
  price: string;
  attendee_name: string; // "Danilo Kim"
  attendee_email: string;
  subevent: number;
}

export interface PretixSubevent {
  id: number;
  date_from?: string | null;
  date_to?: string | null;
}

export interface PretixConfig {
  token: string;
  orgUrl: string;
  zuEventID: string;
  zuVisitorEventID: string;
  zuEventOrganizersItemID: number;
}
