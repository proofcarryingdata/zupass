import { decodeQRPayload } from "@pcd/passport-ui";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useEffect, useState } from "react";
import { useQuery } from "../../../../src/appHooks";

export type TicketIdAndEventId = {
  loading: boolean;
  ticketId: string | null;
  eventId: string | null;
  error: string | null;
};

export function useTicketDataFromQuery(): TicketIdAndEventId {
  const query = useQuery();
  const id = query.get("id");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  useEffect(() => {
    if (!id) {
      const pcdStr = query.get("pcd");
      const decodedPCD = decodeQRPayload(pcdStr);
      const verify = async (): Promise<void> => {
        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(decodedPCD).pcd
        );
        const verified = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
        if (verified) {
          setTicketId(pcd.claim.partialTicket.ticketId);
          setEventId(pcd.claim.partialTicket.eventId);
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
      setTicketId(ticketId);
      setEventId(eventId);
      setLoading(false);
    }
  }, [id, query]);

  return { loading, ticketId, error, eventId };
}
