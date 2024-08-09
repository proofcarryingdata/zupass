import { z } from "zod";
import { TicketCategory } from "./PODTicketPCD";

/**
 * Validator that ensures that a value can really be transformed into a BigInt.
 * Only relevant for strings which may contain non-numeric values.
 */
export function canBeBigInt(a: string): boolean {
  try {
    BigInt(a);
  } catch (_err) {
    return false;
  }
  return true;
}

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
  attendeeSemaphoreId: z.string().refine(canBeBigInt),
  isConsumed: z.boolean(),
  isRevoked: z.boolean(),
  ticketCategory: z.nativeEnum(TicketCategory),
  attendeeName: z.string(),
  attendeeEmail: z.string()
});

export type IPODTicketData = z.infer<typeof TicketDataSchema>;
