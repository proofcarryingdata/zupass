import { TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { readFile } from "jsonfile";
import { z } from "zod";

const TicketSchema = z.object({
  attendeeEmail: z.string(),
  attendeeName: z.string(),
  eventName: z.string(),
  ticketName: z.string(),
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
  productId: z.string().uuid(),
  ticketCategory: z
    .enum(["Devconnect", "ZuConnect", "Zuzalu", "Generic"])
    .transform((str) => {
      switch (str) {
        case "Devconnect":
          return TicketCategory.Devconnect;
        case "ZuConnect":
          return TicketCategory.ZuConnect;
        case "Zuzalu":
          return TicketCategory.Zuzalu;
        case "Generic":
          return TicketCategory.PcdWorkingGroup;
        default:
          throw new Error("Unknown ticket category");
      }
    })
});

export type Ticket = z.infer<typeof TicketSchema>;

const TicketFileSchema = z.record(z.array(TicketSchema));

export async function loadTickets(): Promise<Record<string, Ticket[]>> {
  const tickets = TicketFileSchema.parse(await readFile("./feed/tickets.json"));
  return tickets;
}
