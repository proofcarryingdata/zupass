import { POD, PODEntries } from "@pcd/pod";
import { PODTicketPCD } from "./PODTicketPCD";
import { dataToPodEntries } from "./data";
import { IPODTicketData, TicketDataSchema } from "./schema";

/**
 * Convert POD entries to a IPODTicketData object.
 *
 * @param entries - The POD entries to convert
 * @returns The PODTicketData object
 */
export function podEntriesToTicketData(entries: PODEntries): IPODTicketData {
  return TicketDataSchema.parse(
    Object.fromEntries(
      Object.entries(entries).map(([key, entry]) => [key, entry.value])
    )
  );
}

/**
 * Convert a PODTicketPCD to a POD.
 *
 * @param pcd - The PODTicketPCD to convert
 * @returns The POD
 */
export function podTicketPCDToPOD(pcd: PODTicketPCD): POD {
  return POD.load(
    dataToPodEntries(
      pcd.claim.ticket,
      TicketDataSchema,
      TicketDataSchema.shape
    ),
    pcd.proof.signature,
    pcd.claim.signerPublicKey
  );
}
