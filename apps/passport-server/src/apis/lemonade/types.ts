import { z } from "zod";

export interface GetHostingEventsResponse {
  getHostingEvents: {
    _id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    url_go?: string;
    slug: string;
    cover?: string;
    new_photos?: { url: string }[];
    guest_limit?: number;
    guest_limit_per?: number;
  }[];
}

export type LemonadeEvents = GetHostingEventsResponse["getHostingEvents"];
export type LemonadeEvent = LemonadeEvents[number];

export interface GetEventTicketTypesResponse {
  getEventTicketTypes: {
    ticket_types: {
      _id: string;
      title: string;
      prices: {
        cost: string;
        currency: string;
        default?: boolean | null;
        network?: string | null;
      }[];
    }[];
  };
}

export type LemonadeTicketTypes =
  GetEventTicketTypesResponse["getEventTicketTypes"];
export type LemonadeTicketType = LemonadeTicketTypes["ticket_types"][number];

export const LemonadeTicketSchema = z.object({
  _id: z.string(),
  assigned_email: z.string(),
  assigned_to: z.string(),
  user_id: z.string(),
  user_email: z.string(),
  user_name: z.string(),
  user_first_name: z.string(),
  user_last_name: z.string(),
  type_id: z.string(),
  type_title: z.string(),
  checkin_date: z.string().transform((arg) => {
    try {
      const time = Date.parse(arg);
      if (!isNaN(time)) {
        return new Date(time);
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  })
});

export type LemonadeTicket = z.infer<typeof LemonadeTicketSchema>;

export interface UpdateEventCheckinResponse {
  updateEventCheckin: boolean;
}

export type LemonadeCheckin = UpdateEventCheckinResponse["updateEventCheckin"];
