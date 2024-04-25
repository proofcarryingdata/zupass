import {
  PODBOX_CREDENTIAL_REQUEST,
  PodboxTicketAction,
  PodboxTicketActionResult,
  requestPodboxTicketAction
} from "@pcd/passport-interface";
import { useCallback, useState } from "react";
import urljoin from "url-join";
import { appConfig } from "../../../../../../src/appConfig";
import {
  useCredentialManager,
  useStateContext
} from "../../../../../../src/appHooks";
import { podboxCheckInWithOffline } from "../../../../../../src/podboxCheckin";

export interface TicketActionExecutor {
  loading: boolean;
  result: PodboxTicketActionResult | null;
  execute: () => Promise<PodboxTicketActionResult | undefined>;
  reset: () => void;
}

/**
 * Asks the Podbox server to perform one of the following
 * operations on a ticket:
 * - check ticket in
 * - issue ower of ticket a 'contact card'
 * - issue owner of ticket a 'badge'
 */
export function useExecuteTicketAction({
  action,
  eventId,
  ticketId
}: {
  action: PodboxTicketAction;
  eventId: string;
  ticketId: string;
}): TicketActionExecutor {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PodboxTicketActionResult | null>(null);
  const credentialManager = useCredentialManager();
  const stateContext = useStateContext();

  const execute = useCallback(async (): Promise<
    PodboxTicketActionResult | undefined
  > => {
    if (loading) return;

    setLoading(true);

    if (action.checkin) {
      // Check-in actions can be performed offline.
      const checkinResult = await podboxCheckInWithOffline(
        ticketId,
        eventId,
        stateContext
      );
      setLoading(false);
      setResult(checkinResult);
      return checkinResult;
    } else {
      // Actions other than check-in cannot be performed offline
      const checkinResult = await requestPodboxTicketAction(
        urljoin(appConfig.zupassServer, "generic-issuance/api/check-in"),
        await credentialManager.requestCredential(PODBOX_CREDENTIAL_REQUEST),
        action,
        ticketId,
        eventId
      );
      setLoading(false);
      setResult(checkinResult);
      return checkinResult;
    }
  }, [loading, action, ticketId, eventId, stateContext, credentialManager]);

  const reset = useCallback(() => {
    setLoading(false);
    setResult(null);
  }, []);

  return {
    loading,
    result,
    execute,
    reset
  } satisfies TicketActionExecutor;
}
