import urljoin from "url-join";
import { z } from "zod";
import { logger } from "../../util/logger";

/**
 * These are the ticket "types" we get back from the Tripsha API.
 * @todo confirm these as final.
 */
const TRIPSHA_TICKET_TYPES = [
  "ZuConnect Resident Pass",
  "ZuConnect Organizer Pass",
  "ZuConnect Visitor Pass"
] as const;

/**
 * A schema for validating the API response from Tripsha.
 */
const ZuconnectTripshaSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // Ticket type can only match the set given in TRIPSHA_TICKET_TYPES
  type: z.enum(TRIPSHA_TICKET_TYPES),
  first: z.string(),
  last: z.string()
});

/**
 * Infer a type from the schema.
 */
export type ZuconnectTicket = z.infer<typeof ZuconnectTripshaSchema>;

/**
 * The Zuconnect Tripsha API - can only do one thing, which is fetch tickets.
 */
export interface IZuconnectTripshaAPI {
  fetchTickets(): Promise<ZuconnectTicket[]>;
}

/**
 * Concrete implementation of the Zuconnect Tripsha API client.
 */
export class ZuconnectTripshaAPI {
  private readonly baseUrl;

  public constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch data from the API endpoint, and then parse and validate it.
   * Throws errors if either the fetch fails, or if the data received is
   * invalid according to the schema {@link ZuconnectTripshaSchema}.
   */
  public async fetchTickets(): Promise<ZuconnectTicket[]> {
    const url = urljoin(this.baseUrl, "tickets");
    const fetchResult = await fetch(url);
    const data = await fetchResult.json();

    const parsed = z
      .object({ tickets: z.array(ZuconnectTripshaSchema) })
      .safeParse(data);

    if (parsed.success) {
      return parsed.data.tickets;
    } else {
      throw parsed.error;
    }
  }
}

/**
 * Gets an instance of the API client with default configuration. Fails if
 * expected configuration is not available.
 */
export function getZuconnectTripshaAPI(): ZuconnectTripshaAPI | null {
  if (process.env.ZUCONNECT_TRIPSHA_URL) {
    return new ZuconnectTripshaAPI(process.env.ZUCONNECT_TRIPSHA_URL);
  }

  logger(
    "[ZUCONNECT TRIPSHA] Missing 'ZUCONNECT_TRIPSHA_URL' environment variable"
  );
  return null;
}
