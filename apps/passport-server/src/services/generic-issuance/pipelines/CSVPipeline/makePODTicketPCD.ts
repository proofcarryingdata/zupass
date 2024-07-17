import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PODTicketPCD, PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { traced } from "../../../telemetryService";
import { rowToTicket } from "./makeTicketPCD";

export async function makePODTicketPCD(
  inputRow: string[],
  eddsaPrivateKey: string,
  requesterEmail: string | undefined,
  requesterSemaphoreId: string | undefined,
  pipelineId: string,
  issueToUnmatchedEmail: boolean | undefined
): Promise<SerializedPCD<PODTicketPCD> | undefined> {
  return traced("", "makePODTicketPCD", async () => {
    if (!requesterEmail || !requesterSemaphoreId) {
      return undefined;
    }

    const ticket = rowToTicket(inputRow, requesterSemaphoreId, pipelineId);

    if (!ticket) {
      return undefined;
    }

    if (
      !issueToUnmatchedEmail &&
      ticket.attendeeEmail.toLowerCase() !== requesterEmail.toLowerCase()
    ) {
      return undefined;
    }

    const pcd = await PODTicketPCDPackage.prove({
      privateKey: {
        value: eddsaPrivateKey,
        argumentType: ArgumentTypeName.String
      },
      id: {
        value: ticket.ticketId,
        argumentType: ArgumentTypeName.String
      },
      ticket: {
        value: ticket,
        argumentType: ArgumentTypeName.Object
      }
    });

    const serialized = await PODTicketPCDPackage.serialize(pcd);
    return serialized;
  });
}
