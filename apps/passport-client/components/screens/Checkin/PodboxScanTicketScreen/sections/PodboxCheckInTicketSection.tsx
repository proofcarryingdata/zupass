import { EmailPCD, EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  GenericIssuanceCheckInError,
  createGenericCheckinCredentialPayload,
  requestGenericIssuanceCheckIn
} from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useState } from "react";
import urljoin from "url-join";
import { appConfig } from "../../../../../src/appConfig";
import {
  usePCDCollection,
  useUserIdentityPCD
} from "../../../../../src/appHooks";
import { loadUsingLaserScanner } from "../../../../../src/localstorage";
import { Button } from "../../../../core";
import { RippleLoader } from "../../../../core/RippleLoader";
import {
  CheckinSectionContainer,
  CheckinSuccess,
  Home,
  ScanAnotherTicket,
  StatusContainer
} from "../PodboxScanTicketScreen";
import { PodboxTicketErrorSection } from "./PodboxTicketErrorSection";

export function CheckInPodboxTicketSection({
  ticketId,
  eventId
}: {
  ticketId: string;
  eventId: string;
}): JSX.Element {
  const [inProgress, setInProgress] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);
  const [checkinError, setCheckinError] =
    useState<GenericIssuanceCheckInError | null>(null);
  const usingLaserScanner = loadUsingLaserScanner();
  const pcdCollection = usePCDCollection();
  const identityPCD = useUserIdentityPCD();

  const onCheckInClick = useCallback(async () => {
    if (inProgress) {
      return;
    }

    setInProgress(true);
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

    const checkinResult = await requestGenericIssuanceCheckIn(
      urljoin(appConfig.zupassServer, "generic-issuance/api/check-in"),
      await SemaphoreSignaturePCDPackage.serialize(signedPayload)
    );
    setInProgress(false);

    if (!checkinResult.success) {
      setCheckinError({ name: "ServerError" });
    } else if (checkinResult.value.checkedIn === false) {
      setCheckinError(checkinResult.value.error);
    } else {
      setCheckedIn(true);
    }
    setFinishedCheckinAttempt(true);
  }, [inProgress, pcdCollection, ticketId, eventId, identityPCD]);

  return (
    <CheckinSectionContainer>
      {!inProgress && !finishedCheckinAttempt && (
        <>
          <Button onClick={onCheckInClick}>Check In</Button>
          <Spacer h={8} />
          <ScanAnotherTicket />
          {!usingLaserScanner && <Home />}
        </>
      )}
      {inProgress && <RippleLoader />}
      {finishedCheckinAttempt && (
        <>
          {checkedIn ? (
            <>
              <StatusContainer>
                <CheckinSuccess>Checked In ✅</CheckinSuccess>
              </StatusContainer>
              <ScanAnotherTicket />
              {!usingLaserScanner && <Home />}
            </>
          ) : (
            <>
              <PodboxTicketErrorSection error={checkinError} />
              <Spacer h={16} />
              <ScanAnotherTicket />
              {!usingLaserScanner && <Home />}
            </>
          )}
        </>
      )}
    </CheckinSectionContainer>
  );
}
