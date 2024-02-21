import { EmailPCD, EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  GenericIssuancePreCheckResult,
  createGenericCheckinCredentialPayload,
  requestGenericIssuancePreCheck
} from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useEffect, useState } from "react";
import urljoin from "url-join";
import { appConfig } from "../../../../src/appConfig";
import { usePCDCollection, useUserIdentityPCD } from "../../../../src/appHooks";
import { RippleLoader } from "../../../core/RippleLoader";
import { TicketError } from "../DevconnectCheckinByIdScreen";
import { GenericIssuanceUserReadyForCheckin } from "./GenericIssuanceUserReadyForCheckin";

/**
 * Before check-in can be attempted, verify that the user can check the ticket
 * in, and show the results of the check.
 */
export function PreCheckTicket({
  ticketId,
  eventId
}: {
  ticketId: string;
  eventId: string;
}): JSX.Element {
  const { loading: checkingTicket, result: checkTicketByIdResult } =
    usePreCheckTicket(ticketId, eventId);

  let content = null;

  if (checkingTicket) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else if (checkTicketByIdResult.success === false) {
    content = <TicketError error={{ name: "ServerError" }} />;
  } else if (checkTicketByIdResult.value.canCheckIn === false) {
    content = <TicketError error={checkTicketByIdResult.value.error} />;
  } else {
    content = (
      <GenericIssuanceUserReadyForCheckin
        ticketId={ticketId}
        eventId={eventId}
        ticketData={checkTicketByIdResult.value}
      />
    );
  }

  return content;
}

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
      result: GenericIssuancePreCheckResult;
    } {
  const [inProgress, setInProgress] = useState(true);
  const [result, setResult] = useState<
    GenericIssuancePreCheckResult | undefined
  >();
  const pcdCollection = usePCDCollection();
  const identityPCD = useUserIdentityPCD();

  const doPreCheckTicket = useCallback(
    async (ticketId: string | undefined, eventId: string | undefined) => {
      if (!ticketId || !eventId) {
        return;
      }

      const emailPCDs = pcdCollection.getPCDsByType(
        EmailPCDTypeName
      ) as EmailPCD[];
      if (emailPCDs.length !== 1) {
        return;
      }

      const serializedEmailPCD = await EmailPCDPackage.serialize(emailPCDs[0]);
      const payload = createGenericCheckinCredentialPayload(
        serializedEmailPCD,
        ticketId,
        eventId
      );

      const signedPayload = await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(identityPCD)
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: JSON.stringify(payload)
        }
      });

      const preCheckTicketResult = await requestGenericIssuancePreCheck(
        urljoin(appConfig.zupassServer, "generic-issuance/api/pre-check"),
        await SemaphoreSignaturePCDPackage.serialize(signedPayload)
      );
      setInProgress(false);
      setResult(preCheckTicketResult);
    },
    [identityPCD, pcdCollection]
  );

  useEffect(() => {
    doPreCheckTicket(ticketId, eventId);
  }, [doPreCheckTicket, eventId, ticketId]);

  if (inProgress) {
    return { loading: true, result: undefined };
  } else {
    return { loading: false, result };
  }
}
