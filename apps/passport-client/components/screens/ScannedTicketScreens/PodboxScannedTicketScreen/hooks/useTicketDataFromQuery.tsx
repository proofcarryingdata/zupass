import { decodeQRPayload } from "@pcd/passport-ui";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { useQuery } from "../../../../../src/appHooks";

export type TicketIdAndEventId = {
  loading: boolean;
  ticketId: string | null;
  eventId: string | null;
  error: string | null;
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

  const [loading, setLoading] = useState<boolean>(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setTicketId(null);
    setEventId(null);
    setError(null);

    if (!id && pcdStr) {
      const decodedPCD = decodeQRPayload(pcdStr);
      const verify = async (): Promise<void> => {
        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(decodedPCD).pcd
        );
        const verified = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
        if (verified) {
          setTicketId(pcd.claim.partialTicket.ticketId as string);
          setEventId(pcd.claim.partialTicket.eventId as string);
          setLoading(false);
        } else {
          setLoading(false);
          setError("Could not verify ticket. Please try scanning again.");
        }
      };

      verify();
    } else {
      // TODO check the timestamp also included here
      const { ticketId, eventId } = JSON.parse(
        Buffer.from(id, "base64").toString()
      );
      setLoading(false);
      setTicketId(ticketId);
      setEventId(eventId);
      setError(null);
    }
  }, [id, pcdStr]);

  return { loading, ticketId, error, eventId };
}
