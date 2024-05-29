import { z } from "zod";

export interface GetHostingEventsResponse {
  getHostingEvents: {
    _id: string;
    title: string;
  }[];
}

export type LemonadeEvents = GetHostingEventsResponse["getHostingEvents"];
export type LemonadeEvent = LemonadeEvents[number];

export interface GetEventTicketTypesResponse {
  getEventTicketTypes: {
    ticket_types: {
      _id: string;
      title: string;
    }[];
  };
}

export type LemonadeTicketTypes =
  GetEventTicketTypesResponse["getEventTicketTypes"];
export type LemonadeTicketType = LemonadeTicketTypes["ticket_types"][number];

export const LemonadeTicketSchema = z
  .object({
    _id: z.string().min(1, "_id cannot be empty"),
    // "Assigned" email is for tickets where the user has no Lemonade account
    assigned_email: z.string(),
    user_id: z
      .string()
      .transform((val) =>
        typeof val === "string" && val.length === 0 ? undefined : val
      ),
    // "User" email is populated when the user has a Lemonade account
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
  })
  .transform((val, ctx) => {
    // Set a new "email" field using either the assigned or user email.
    if (val.user_email.length > 0) {
      return { ...val, email: val.user_email };
    } else if (val.assigned_email.length > 0) {
      return { ...val, email: val.assigned_email };
    } else {
      // If neither exist, fail validation.
      ctx.addIssue({
        code: "custom",
        message: "Neither user_email or assigned_email are present"
      });
      return z.NEVER;
    }
  });

export type LemonadeTicket = z.infer<typeof LemonadeTicketSchema>;

export interface UpdateEventCheckinResponse {
  updateEventCheckin: boolean;
}

export type LemonadeCheckin = UpdateEventCheckinResponse["updateEventCheckin"];
