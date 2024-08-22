import { z } from "zod";
import { TicketCategory } from "./PODTicketPCD";

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
  /**
   * User's Zupass semaphore v4 ID, which is an EdDSA public key.
   */
  attendeeSemaphoreV4Id: z.string(),
  isConsumed: z.boolean(),
  isRevoked: z.boolean(),
  ticketCategory: z.nativeEnum(TicketCategory),
  attendeeName: z.string(),
  attendeeEmail: z.string()
});

export type IPODTicketData = z.infer<typeof TicketDataSchema>;
