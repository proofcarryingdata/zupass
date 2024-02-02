import { EmailPCD, EmailPCDPackage, EmailPCDTypeName } from "@pcd/email-pcd";
import {
  GenericIssuanceCheckInError,
  GenericIssuancePreCheckResponseValue,
  GenericIssuancePreCheckResult,
  createGenericCheckinCredentialPayload,
  requestGenericIssuanceCheckIn,
  requestGenericIssuancePreCheck
} from "@pcd/passport-interface";
import { Spacer, decodeQRPayload } from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import urljoin from "url-join";
import { appConfig } from "../../src/appConfig";
import {
  useLaserScannerKeystrokeInput,
  usePCDCollection,
  useQuery,
  useUserIdentityPCD
} from "../../src/appHooks";
import { loadUsingLaserScanner } from "../../src/localstorage";
import { Button, H5 } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../shared/PCDCard";

export function GenericIssuanceCheckInScreen(): JSX.Element {
  useLaserScannerKeystrokeInput();
  const { loading: verifyingTicketId, ticketId, eventId } = useTicketId();

  let content = null;

  if (verifyingTicketId) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else {
    content = <PreCheckTicket ticketId={ticketId} eventId={eventId} />;
  }

  return (
    <AppContainer bg={"primary"}>
      <Container>{content}</Container>
    </AppContainer>
  );
}

type TicketIdAndEventId = {
  loading: boolean;
  ticketId: string | null;
  eventId: string | null;
  error: string | null;
};

function useTicketId(): TicketIdAndEventId {
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

function PreCheckTicket({
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

export function GenericIssuanceUserReadyForCheckin({
  ticketData,
  ticketId,
  eventId
}: {
  ticketData: Extract<
    GenericIssuancePreCheckResponseValue,
    { canCheckIn: true }
  >;
  ticketId: string;
  eventId: string;
}): JSX.Element {
  return (
    <>
      <TicketInfoSection ticketData={ticketData} />
      <CheckInSection ticketId={ticketId} eventId={eventId} />
    </>
  );
}

function TicketInfoSection({
  ticketData
}: {
  ticketData: Extract<
    GenericIssuancePreCheckResponseValue,
    { canCheckIn: true }
  >;
}): JSX.Element {
  return (
    <CardOutlineExpanded>
      <CardHeader>
        <div>{ticketData.eventName}</div>
      </CardHeader>
      <CardBodyContainer>
        <TicketInfoContainer>
          <Spread>
            <span>Ticket Type</span> {ticketData.ticketName}
          </Spread>
          <Spread>
            <span>Name</span> {ticketData.attendeeName}
          </Spread>
          <Spread>
            <span>Email</span> {ticketData.attendeeEmail}
          </Spread>
        </TicketInfoContainer>
      </CardBodyContainer>
    </CardOutlineExpanded>
  );
}

function CheckInSection({
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
              <TicketErrorContent error={checkinError} />
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

function TicketErrorContent({
  error
}: {
  error: GenericIssuanceCheckInError;
}): JSX.Element {
  let errorContent = null;

  switch (error.name) {
    case "AlreadyCheckedIn":
      errorContent = (
        <>
          <ErrorTitle>Already checked in</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Checked in at</span>
            <span>{new Date(error.checkinTimestamp).toLocaleString()}</span>
          </Spread>
          <Spread>
            <span>Checked in by</span>
            <span>{error.checker}</span>
          </Spread>
        </>
      );
      break;
    case "InvalidSignature":
      errorContent = (
        <>
          <ErrorTitle>Invalid Ticket Signature</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket was not issued by Zupass.</span>
        </>
      );
      break;
    case "InvalidTicket":
      errorContent = (
        <>
          <ErrorTitle>Invalid ticket</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket is invalid.</span>
        </>
      );
      break;
    case "NotSuperuser":
      errorContent = (
        <>
          <ErrorTitle>Not authorized</ErrorTitle>
          <Spacer h={8} />
          <div>{error.detailedMessage}</div>
        </>
      );
      break;
    case "ServerError":
      errorContent = (
        <>
          <ErrorTitle>Network Error</ErrorTitle>
          <Spacer h={8} />
          <span>please try again</span>
        </>
      );
      break;
    case "TicketRevoked":
      errorContent = (
        <>
          <ErrorTitle>This ticket was revoked</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Revoked at</span>
            <span>{error.revokedTimestamp}</span>
          </Spread>
        </>
      );
      break;
  }

  return <ErrorContainer>{errorContent}</ErrorContainer>;
}

function TicketError({
  error
}: {
  error: GenericIssuanceCheckInError;
}): JSX.Element {
  const usingLaserScanner = loadUsingLaserScanner();
  return (
    <>
      <TicketErrorContent error={error} />
      <div
        style={{
          marginTop: "16px",
          width: "100%"
        }}
      >
        <ScanAnotherTicket />
        {!usingLaserScanner && <Home />}
      </div>
    </>
  );
}

function ScanAnotherTicket(): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/scan";
  }, []);

  return (
    <Button style="secondary" onClick={onClick}>
      Scan Another Ticket
    </Button>
  );
}

function Home(): JSX.Element {
  const onClick = useCallback(() => {
    window.location.href = "/#/";
  }, []);

  return (
    <>
      <Spacer h={8} />
      <Button style="secondary" onClick={onClick}>
        Home
      </Button>
    </>
  );
}

const TicketInfoContainer = styled.div`
  padding: 16px;
`;

const Container = styled.div`
  margin-top: 64px;
  color: var(--bg-dark-primary);
  width: 400px;
  padding: 0px 32px;
`;

const CheckinSuccess = styled.span`
  color: green;
  font-size: 1.5em;
`;

const CheckinSectionContainer = styled.div`
  margin-top: 16px;
`;

const Spread = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ErrorContainer = styled.div`
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--danger);
  border-radius: 12px;
  background: white;
`;

const ErrorTitle = styled(H5)`
  color: var(--danger);
`;

const StatusContainer = styled.div`
  padding: 64px 16px;
  background-color: #dfffc6;
  margin-top: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
`;
