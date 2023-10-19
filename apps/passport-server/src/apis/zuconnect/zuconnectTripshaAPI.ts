import { ZUCONNECT_TICKET_NAMES } from "@pcd/passport-interface";
import _ from "lodash";
import urljoin from "url-join";
import { z } from "zod";
import { logger } from "../../util/logger";
import { instrumentedFetch } from "../fetch";

/**
 * A schema for validating the API response from Tripsha.
 */
const ZuconnectTripshaSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // Ticket type can only match the set given in TRIPSHA_TICKET_TYPES
  ticketName: z.enum(ZUCONNECT_TICKET_NAMES).default("ZuConnect Resident Pass"),
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
    return {
      id,
      ticketName,
      email,
      fullName: `${first} ${last}`.trim()
    };
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
    const fetchResult = await instrumentedFetch(url);

    if (fetchResult.status !== 200) {
      throw new Error(
        `Tripsha API responded with not-ok status code ${fetchResult.status}`
      );
    }

    const data = await fetchResult.json();

    if (_.isArray(data.tickets)) {
      const parsed = data.tickets.flatMap((ticket: any) => {
        const parsedTicket =
          ZuconnectTripshaNormalizedNameSchema.safeParse(ticket);

        if (parsedTicket.success) {
          return parsedTicket.data;
        } else {
          logger(
            `Could not parsed ticket due to errors:`,
            parsedTicket.error.issues
          );
          return [];
        }
      });

      return parsed;
    } else {
      throw new Error(`Invalid data received`, data);
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
