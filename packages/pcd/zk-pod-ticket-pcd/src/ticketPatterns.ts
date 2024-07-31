import { PODEdDSAPublicKeyValue, PODStringValue } from "@pcd/pod";
import { TicketMatchPatterns } from "./ZKPODTicketPCD";

/**
 * Convert a {@link TicketMatchPatterns} into an array of POD entry names, used
 * for specifying tuples in a GPC proof input.
 *
 * @param value The patterns to convert
 * @returns An array of entries
 */
export function entriesFromPattern(
  patterns: TicketMatchPatterns
): `${string}.${string}`[] {
  const idPatternEntries: `${string}.${string}`[] = [];

  if (patterns.length > 0) {
    idPatternEntries.push("ticketPOD.$signerPublicKey");
    if (patterns[0].events && patterns[0].events.length > 0) {
      idPatternEntries.push("ticketPOD.eventId");
      if (
        patterns[0].events[0].productIds &&
        patterns[0].events[0].productIds.length > 0
      ) {
        idPatternEntries.push("ticketPOD.productId");
      }
    }
  }

  return idPatternEntries;
}

/**
 * A tuple representing an admissible pattern for the ticket.
 * These patterns are hierarchical, in the sense that one signing key can have
 * many event IDs, and each event ID can have many product IDs. However, for
 * use with GPC, we flatten these into tuples.
 */
type AdmissibleTuple =
  // Match on signing  key, event ID, product ID
  | [PODEdDSAPublicKeyValue, PODStringValue, PODStringValue]
  // Match on signing key, event ID
  | [PODEdDSAPublicKeyValue, PODStringValue];

/**
 * Convert a {@link TicketMatchPatterns} into an array of {@link AdmissibleTuple}.
 * As a generator function, it yields one tuple at a time, and should generally
 * be used in a `for...of` loop or with a function like `Array.from`.
 *
 * @param value The patterns to convert
 * @returns An array of tuples
 */
export function* patternsToPODValueTuples(
  value: TicketMatchPatterns
): Generator<AdmissibleTuple> {
  for (const pattern of value) {
    if (pattern.events) {
      for (const event of pattern.events) {
        if (event.productIds) {
          for (const productId of event.productIds) {
            yield [
              PODEdDSAPublicKeyValue(pattern.signerPublicKey),
              { type: "string", value: event.id },
              { type: "string", value: productId }
            ];
          }
        } else {
          yield [
            PODEdDSAPublicKeyValue(pattern.signerPublicKey),
            { type: "string", value: event.id }
          ];
        }
      }
    }
  }
}
