import { PodboxTicketActionPreCheckResult } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import {
  useDispatch,
  useStateContext,
  useUserIdentityPCD
} from "../../../../../src/appHooks";
import { podboxPreCheckWithOffline } from "../../../../../src/podboxCheckin";

/**
 * Once a ticket has been scanned by the qr code reader, Zupass makes a
 * request to the Podbox backend to determine what it can do with a ticket.
 * The possibilities are:
 *
 * - nothing
 * - check this user in
 * - give this user a badge
 * - give this user your contact card.
 */
export function usePreCheckTicket(
  ticketId: string | undefined,
  eventId: string | undefined
):
  | {
      loading: true;
      result: undefined;
    }
  | {
      loading: false;
      result: PodboxTicketActionPreCheckResult;
    } {
  const [result, setResult] = useState<
    PodboxTicketActionPreCheckResult | undefined
  >();
  const identityPCD = useUserIdentityPCD();
  const dispatch = useDispatch();
  const stateContext = useStateContext();

  const doPreCheckTicket = useCallback(
    async (ticketId: string | undefined, eventId: string | undefined) => {
      if (!ticketId || !eventId) {
        return;
      }

      if (!identityPCD) {
        await dispatch({ type: "participant-invalid" });
        return;
      }

      const preCheckTicketResult = await podboxPreCheckWithOffline(
        ticketId,
        eventId,
        stateContext
      );
      console.log(preCheckTicketResult);
      setResult(preCheckTicketResult);
    },
    [dispatch, identityPCD, stateContext]
  );

  useEffect(() => {
    doPreCheckTicket(ticketId, eventId);
  }, [doPreCheckTicket, eventId, ticketId]);

  if (result) {
    return { loading: false, result };
  } else {
    return { loading: true, result: undefined };
  }
}
