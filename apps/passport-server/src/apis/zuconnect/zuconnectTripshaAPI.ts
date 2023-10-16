import { ZUCONNECT_TICKET_NAMES } from "@pcd/passport-interface";
import urljoin from "url-join";
import { z } from "zod";
import { logger } from "../../util/logger";

/**
 * A schema for validating the API response from Tripsha.
 */
const ZuconnectTripshaSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // Ticket type can only match the set given in TRIPSHA_TICKET_TYPES
  ticketName: z.enum(ZUCONNECT_TICKET_NAMES),
  first: z.string(),
  // Last names might be undefined or null
  last: z
    .string()
    .nullable()
    .optional()
    .transform((last) => last ?? "")
});

const ZuconnectTripshaNormalizedNameSchema = ZuconnectTripshaSchema
  // Handle the logic of name concatenation here
  .transform(({ first, last, id, ticketName, email }) => {
    return { id, ticketName, email, fullName: `${first} ${last}`.trim() };
  });

/**
 * Infer a type from the schema.
 */
export type ZuconnectRawTripshaTicket = z.infer<typeof ZuconnectTripshaSchema>;
export type ZuconnectTicket = z.infer<
  typeof ZuconnectTripshaNormalizedNameSchema
>;

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
  private readonly authKey;

  public constructor(baseUrl: string, authKey: string) {
    this.baseUrl = baseUrl;
    this.authKey = authKey;
  }

  /**
   * Fetch data from the API endpoint, and then parse and validate it.
   * Throws errors if either the fetch fails, or if the data received is
   * invalid according to the schema {@link ZuconnectTripshaSchema}.
   */
  public async fetchTickets(): Promise<ZuconnectTicket[]> {
    const url = urljoin(this.baseUrl, "tickets", this.authKey);
    const fetchResult = await fetch(url);
    const data = await fetchResult.json();
    const parsed = z
      .object({ tickets: z.array(ZuconnectTripshaNormalizedNameSchema) })
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
  if (process.env.ZUCONNECT_TRIPSHA_URL && process.env.ZUCONNECT_TRIPSHA_KEY) {
    return new ZuconnectTripshaAPI(
      process.env.ZUCONNECT_TRIPSHA_URL,
      process.env.ZUCONNECT_TRIPSHA_KEY
    );
  }

  logger(
    "[ZUCONNECT TRIPSHA] Missing 'ZUCONNECT_TRIPSHA_URL' or 'ZUCONNECT_TRIPSHA_KEY' environment variable"
  );
  return null;
}
