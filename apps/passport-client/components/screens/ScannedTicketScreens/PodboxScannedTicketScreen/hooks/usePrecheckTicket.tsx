import {
  PodboxActionPreCheckResult,
  requestGenericIssuancePreCheck
} from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import urljoin from "url-join";
import { appConfig } from "../../../../../src/appConfig";
import {
  useCredentialManager,
  useDispatch,
  useUserIdentityPCD
} from "../../../../../src/appHooks";

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
      result: PodboxActionPreCheckResult;
    } {
  const [result, setResult] = useState<
    PodboxActionPreCheckResult | undefined
  >();
  const identityPCD = useUserIdentityPCD();
  const dispatch = useDispatch();
  const credentialManager = useCredentialManager();

  const doPreCheckTicket = useCallback(
    async (ticketId: string | undefined, eventId: string | undefined) => {
      if (!ticketId || !eventId) {
        return;
      }

      if (!identityPCD) {
        await dispatch({ type: "participant-invalid" });
        return;
      }

      const preCheckTicketResult = await requestGenericIssuancePreCheck(
        urljoin(appConfig.zupassServer, "generic-issuance/api/pre-check"),
        await credentialManager.requestCredential({
          pcdType: "email-pcd",
          signatureType: "sempahore-signature-pcd"
        }),
        { checkin: true },
        ticketId,
        eventId
      );
      setResult(preCheckTicketResult);
    },
    [credentialManager, dispatch, identityPCD]
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
