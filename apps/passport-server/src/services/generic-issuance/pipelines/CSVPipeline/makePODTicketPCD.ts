import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import { PODTicketPCD, PODTicketPCDPackage } from "@pcd/pod-ticket-pcd";
import { traced } from "../../../telemetryService";
import { csvRowToPODTicketData } from "./makeTicketPCD";

export async function makePODTicketPCD(
  inputRow: string[],
  eddsaPrivateKey: string,
  requesterEmail: string | undefined,
  requesterSemaphoreId: string | undefined,
  requesterSemaphoreV4Id: string | undefined,
  pipelineId: string,
  issueToUnmatchedEmail: boolean | undefined
): Promise<SerializedPCD<PODTicketPCD> | undefined> {
  return traced("", "makePODTicketPCD", async () => {
    if (!requesterEmail || !requesterSemaphoreId || !requesterSemaphoreV4Id) {
      return undefined;
    }

    const ticket = csvRowToPODTicketData(
      inputRow,
      requesterSemaphoreId,
      requesterSemaphoreV4Id,
      pipelineId
    );

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
