import { EmailPCD, EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  PodboxTicketAction,
  PodboxTicketActionResult,
  createTicketActionCredentialPayload,
  requestPodboxTicketAction
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useState } from "react";
import urljoin from "url-join";
import { appConfig } from "../../../../../../src/appConfig";
import {
  usePCDCollection,
  useUserIdentityPCD
} from "../../../../../../src/appHooks";

export interface TicketActionExecutor {
  loading: boolean;
  result: PodboxTicketActionResult | null;
  execute: () => Promise<PodboxTicketActionResult>;
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
  action?: PodboxTicketAction;
  eventId: string;
  ticketId: string;
}): TicketActionExecutor {
  const pcdCollection = usePCDCollection();
  const identityPCD = useUserIdentityPCD();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PodboxTicketActionResult | null>(null);

  const execute = useCallback(async (): Promise<
    PodboxTicketActionResult | undefined
  > => {
    if (loading) return;

    const emailPCDs = pcdCollection.getPCDsByType(
      EmailPCDTypeName
    ) as EmailPCD[];

    if (emailPCDs.length !== 1) {
      return;
    }

    setLoading(true);

    const checkinResult = await requestPodboxTicketAction(
      urljoin(appConfig.zupassServer, "generic-issuance/api/check-in"),
      await SemaphoreSignaturePCDPackage.serialize(
        await SemaphoreSignaturePCDPackage.prove({
          identity: {
            argumentType: ArgumentTypeName.PCD,
            value: await SemaphoreIdentityPCDPackage.serialize(identityPCD)
          },
          signedMessage: {
            argumentType: ArgumentTypeName.String,
            value: JSON.stringify(
              createTicketActionCredentialPayload(
                await EmailPCDPackage.serialize(emailPCDs[0]),
                action,
                eventId,
                ticketId
              )
            )
          }
        })
      )
    );
    setLoading(false);
    setResult(checkinResult);
    return checkinResult;
  }, [loading, pcdCollection, identityPCD, action, eventId, ticketId]);

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
