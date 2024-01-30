import { ZUCONNECT_TICKET_NAMES } from "@pcd/passport-interface";
import _ from "lodash";
import urljoin from "url-join";
import { z } from "zod";
import { logger } from "../../util/logger";
import { instrumentedFetch } from "../fetch";

const DAY_PASSES: Record<string, string> = {
  "601fed54-a065-4a55-9846-46534eff59f9": "Tuesday Oct 31 - Neuroscience",
  "1ef87069-c90c-4f0a-892e-ace558f6aeae": "Wednesday Nov 1 - New Governance",
  "8303310a-5726-427f-8da1-56f4318f4f54":
    "Thursday Nov 2 - AI morning, Art afternoon",
  "bfe5b185-f5de-42c0-980a-4d9908e2b32d": "Friday Nov 3 - DeSci & Longevity",
  "46bbcc6e-4278-42f0-b26c-c06c15efe692": "Saturday Nov 4 - Public Goods",
  "8e48846d-5bdb-480c-8354-30d503157ed9": "Monday Nov 6 - Zero Knowledge",
  "36647eb2-d54f-4bd8-b13e-49f0e18be3cc": "Tuesday Nov 7 - Decentralized Social"
};

/**
 * A schema for validating the API response from Tripsha.
 */
const ZuconnectTripshaSchema = z.object({
  id: z.string(),
  email: z.string().email().toLowerCase().trim(),
  // Ticket type can only match the set given in TRIPSHA_TICKET_TYPES
  ticketName: z.enum(ZUCONNECT_TICKET_NAMES).default("ZuConnect Resident Pass"),
  first: z.string(),
  // Last names might be undefined or null
  last: z
    .string()
    .nullable()
    .optional()
    .transform((last) => last ?? ""),
  options: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .default([])
});

const ZuconnectTripshaNormalizedSchema = ZuconnectTripshaSchema
  // Transform results by concatenating name fields and turning "options" into
  // an array of strings.
  .transform(({ first, last, id, ticketName, email, options }) => {
    const extraInfo: string[] = [];
    if (
      ticketName === "For people only using Day Passes (add-ons)" &&
      options &&
      options.length > 0
    ) {
      for (const option of options) {
        if (option.id in DAY_PASSES) {
          extraInfo.push(DAY_PASSES[option.id]);
        }
      }
    }
    if (ticketName === "Latecomer Pass") {
      ticketName = "ZuConnect Resident Pass";
    }
    return {
      id,
      ticketName,
      email,
      fullName: `${first} ${last}`.trim(),
      extraInfo
    };
  });

/**
 * Infer a type from the schema.
 */
export type ZuconnectRawTripshaTicket = z.infer<typeof ZuconnectTripshaSchema>;
export type ZuconnectTicket = z.infer<typeof ZuconnectTripshaNormalizedSchema>;

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
      const parsed = data.tickets.flatMap((ticket: unknown) => {
        const parsedTicket = ZuconnectTripshaNormalizedSchema.safeParse(ticket);

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
