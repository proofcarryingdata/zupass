import { decodeQRPayload } from "@pcd/passport-ui";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { Buffer } from "buffer";
import { useEffect, useState } from "react";
import { useQuery } from "../../../../../src/appHooks";

export enum TicketIdState {
  Loading,
  Success,
  Error
}

export type TicketIdAndEventId =
  | { state: TicketIdState.Loading }
  | {
      state: TicketIdState.Success;
      ticketId: string;
      eventId: string;
    }
  | {
      state: TicketIdState.Error;
      error: string;
    };

/**
 * The {@link PodboxScannedTicketScreen} receives a ticket from the scanner
 * via the `id` query string parameter. This hook attempts to load the ticket
 * from the query string parameter, and returns the status of that load by
 * returning a {@link TicketIdAndEventId}.
 */
export function useTicketDataFromQuery(): TicketIdAndEventId {
  const query = useQuery();
  const id = query?.get("id");
  const pcdStr = query?.get("pcd");

  const [ticketData, setTicketData] = useState<TicketIdAndEventId>({
    state: TicketIdState.Loading
  });

  useEffect(() => {
    if (!id && pcdStr) {
      const decodedPCD = decodeQRPayload(pcdStr);
      const verify = async (): Promise<void> => {
        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(decodedPCD).pcd
        );
        const verified = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
        if (verified) {
          setTicketData({
            state: TicketIdState.Success,
            ticketId: pcd.claim.partialTicket.ticketId as string,
            eventId: pcd.claim.partialTicket.eventId as string
          });
        } else {
          setTicketData({
            state: TicketIdState.Error,
            error: "Could not verify ticket. Please try scanning again."
          });
        }
      };

      verify();
    } else if (id) {
      // TODO check the timestamp also included here
      const { ticketId, eventId } = JSON.parse(
        Buffer.from(id, "base64").toString()
      );
      setTicketData({
        state: TicketIdState.Success,
        ticketId,
        eventId
      });
    }
  }, [id, pcdStr]);

  return ticketData;
}
