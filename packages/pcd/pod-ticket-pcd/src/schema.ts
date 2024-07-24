import { z } from "zod";
import { TicketCategory } from "./PODTicketPCD";
import { canBeBigInt, cryptographic, dataToPodEntries } from "./data";

export const TicketDataSchema = z.object({
  eventName: z.string(),
  ticketName: z.string(),
  checkerEmail: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAltText: z.string().optional(),
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
  productId: z.string().uuid(),
  timestampConsumed: z.number().int().nonnegative(),
  timestampSigned: z.number().int().nonnegative(),
  attendeeSemaphoreId: z.string().refine(canBeBigInt).transform(cryptographic),
  isConsumed: z.boolean(),
  isRevoked: z.boolean(),
  ticketCategory: z.nativeEnum(TicketCategory),
  attendeeName: z.string(),
  attendeeEmail: z.string()
});

export { dataToPodEntries };

export type IPODTicketData = z.infer<typeof TicketDataSchema>;
