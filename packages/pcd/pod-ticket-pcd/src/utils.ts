import { POD, PODEntries, PODValue } from "@pcd/pod";
import { PODTicketPCD } from "./PODTicketPCD";
import { IPODTicketData, TicketDataSchema } from "./schema";

/**
 * Convert a PODTicketPCD to a POD.
 *
 * @param pcd - The PODTicketPCD to convert
 * @returns The POD
 */
export function podTicketPCDToPOD(pcd: PODTicketPCD): POD {
  return POD.load(
    ticketDataToPODEntries(pcd.claim.ticket),
    pcd.proof.signature,
    pcd.claim.signerPublicKey
  );
}

/**
 * Check that the ticket data is valid.
 *
 * @param data - The ticket data to check
 * @returns The ticket data
 */
export function checkTicketData(data: unknown): IPODTicketData {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid ticket data");
  }
  // Remove undefined values. Zod will permit optional fields to have undefined
  // values, but we never want data contained in a claim to have undefined
  // values as this means that serialization and de-serialization to and from
  // JSON will result in an object with different keys present.
  const definedData = Object.fromEntries(
    Object.entries(data).filter(([_key, value]) => value !== undefined)
  );
  return TicketDataSchema.parse(definedData);
}

/**
 * Convert PODEntries to ticket data.
 *
 * @param entries - The PODEntries to convert
 * @returns The ticket data
 */
export function PODEntriesToTicketData(entries: PODEntries): IPODTicketData {
  const dataEntries = [];
  for (const [key, value] of Object.entries(entries)) {
    const mapper = MapPODEntriesToTicketData[key as keyof IPODTicketData];
    if (mapper === undefined) {
      throw new Error(`Invalid key: ${key}`);
    }
    dataEntries.push([key, mapper(value)]);
  }
  return checkTicketData(Object.fromEntries(dataEntries));
}

export const MapPODEntriesToTicketData: {
  [key in keyof IPODTicketData]: (
    value: PODValue
  ) => Required<IPODTicketData>[key];
} = {
  attendeeName: (value) => value.value.toString(),
  attendeeEmail: (value) => value.value.toString(),
  attendeeSemaphoreId: (value) => value.value.toString(),
  eventName: (value) => value.value.toString(),
  ticketName: (value) => value.value.toString(),
  ticketId: (value) => value.value.toString(),
  eventId: (value) => value.value.toString(),
  productId: (value) => value.value.toString(),
  timestampConsumed: (value) => Number(value.value),
  timestampSigned: (value) => Number(value.value),
  isConsumed: (value) => value.value.toString() === "1",
  isRevoked: (value) => value.value.toString() === "1",
  ticketCategory: (value) => Number(value.value),
  checkerEmail: (value) => value.value.toString(),
  imageUrl: (value) => value.value.toString(),
  imageAltText: (value) => value.value.toString()
};

export const MapTicketDataToPODEntries: {
  [key in keyof Required<IPODTicketData>]: (
    value: Required<IPODTicketData>[key]
  ) => PODValue;
} = {
  attendeeName: (value) => ({
    type: "string",
    value
  }),
  attendeeEmail: (value) => ({
    type: "string",
    value
  }),
  attendeeSemaphoreId: (value) => ({
    type: "cryptographic",
    value: BigInt(value)
  }),
  eventName: (value) => ({
    type: "string",
    value
  }),
  ticketName: (value) => ({
    type: "string",
    value
  }),
  ticketId: (value) => ({
    type: "string",
    value
  }),
  eventId: (value) => ({
    type: "string",
    value
  }),
  productId: (value) => ({
    type: "string",
    value
  }),
  timestampConsumed: (value) => ({
    type: "int",
    value: BigInt(value)
  }),
  timestampSigned: (value) => ({
    type: "int",
    value: BigInt(value)
  }),
  isConsumed: (value) => ({
    type: "int",
    value: BigInt(value ? 1 : 0)
  }),
  isRevoked: (value) => ({
    type: "int",
    value: BigInt(value ? 1 : 0)
  }),
  ticketCategory: (value) => ({
    type: "int",
    value: BigInt(value)
  }),
  // Optional values
  checkerEmail: (value) => ({
    type: "string",
    value
  }),
  imageUrl: (value) => ({
    type: "string",
    value
  }),
  imageAltText: (value) => ({
    type: "string",
    value
  })
};

/**
 * Convert a PODTicketPCD to PODEntries.
 * Does not check that the PODValues are valid, as this will be done in
 * POD.sign() or PODContent.fromEntries().
 *
 * Data should generally first be checked with {@link checkTicketData} to
 * ensure that it is valid.
 *
 * @param data - Ticket data in JS object form
 * @returns The PODEntries
 */
export function ticketDataToPODEntries(data: IPODTicketData): PODEntries {
  return {
    attendeeName: MapTicketDataToPODEntries.attendeeName(data.attendeeName),
    attendeeEmail: MapTicketDataToPODEntries.attendeeEmail(data.attendeeEmail),
    attendeeSemaphoreId: MapTicketDataToPODEntries.attendeeSemaphoreId(
      data.attendeeSemaphoreId
    ),
    eventName: MapTicketDataToPODEntries.eventName(data.eventName),
    ticketName: MapTicketDataToPODEntries.ticketName(data.ticketName),
    ticketId: MapTicketDataToPODEntries.ticketId(data.ticketId),
    eventId: MapTicketDataToPODEntries.eventId(data.eventId),
    productId: MapTicketDataToPODEntries.productId(data.productId),
    timestampConsumed: MapTicketDataToPODEntries.timestampConsumed(
      data.timestampConsumed
    ),

    timestampSigned: MapTicketDataToPODEntries.timestampSigned(
      data.timestampSigned
    ),
    isConsumed: MapTicketDataToPODEntries.isConsumed(data.isConsumed),
    isRevoked: MapTicketDataToPODEntries.isRevoked(data.isRevoked),
    ticketCategory: MapTicketDataToPODEntries.ticketCategory(
      data.ticketCategory
    ),
    // Optional values
    ...(data.checkerEmail
      ? {
          checkerEmail: MapTicketDataToPODEntries.checkerEmail(
            data.checkerEmail
          )
        }
      : {}),
    ...(data.imageUrl
      ? {
          imageUrl: MapTicketDataToPODEntries.imageUrl(data.imageUrl)
        }
      : {}),
    ...(data.imageAltText
      ? {
          imageAltText: MapTicketDataToPODEntries.imageAltText(
            data.imageAltText
          )
        }
      : {})
  } satisfies { [key in keyof IPODTicketData]: PODValue };
}
