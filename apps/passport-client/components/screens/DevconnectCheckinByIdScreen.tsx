import {
  CheckTicketByIdResponseValue,
  CheckTicketByIdResult,
  TicketError
} from "@pcd/passport-interface";
import { Spacer, decodeQRPayload } from "@pcd/passport-ui";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import {
  useLaserScannerKeystrokeInput,
  useQuery,
  useStateContext
} from "../../src/appHooks";
import {
  devconnectCheckByIdWithOffline,
  devconnectCheckInByIdWithOffline
} from "../../src/checkin";
import { loadUsingLaserScanner } from "../../src/localstorage";
import { Button, H5 } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import { IndicateIfOffline } from "../shared/IndicateIfOffline";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../shared/PCDCard";

export function DevconnectCheckinByIdScreen() {
  useLaserScannerKeystrokeInput();
  const { loading: verifyingTicketId, ticketId } = useTicketId();

  let content = null;

  if (verifyingTicketId) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else {
    content = <CheckInById ticketId={ticketId} />;
  }

  return (
    <AppContainer bg={"primary"}>
      <Container>
        <IndicateIfOffline marginBottom="16px">
          <H5 style={{ color: "var(--danger)" }}>Offline Mode</H5>
          <Spacer h={8} />
          You're offline. Zupass is using a backed up copy of event tickets.
          Check-ins will be synced the next time you start the app with a
          working network connection.
        </IndicateIfOffline>
        {content}
      </Container>
    </AppContainer>
  );
}

function CheckInById({ ticketId }: { ticketId: string }) {
  const { loading: checkingTicket, result: checkTicketByIdResult } =
    useCheckTicketById(ticketId);

  let content = null;

  if (checkingTicket) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else if (!checkTicketByIdResult.success) {
    content = <TicketError error={checkTicketByIdResult.error} />;
  } else {
    content = (
      <UserReadyForCheckin
        ticketId={ticketId}
        ticketData={checkTicketByIdResult.value}
      />
    );
  }

  return content;
}

type TicketId = {
  loading: boolean;
  ticketId: string | null;
  error: string | null;
};

function useTicketId(): TicketId {
  const query = useQuery();
  const id = query.get("id");
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      const pcdStr = query.get("pcd");
      const decodedPCD = decodeQRPayload(pcdStr);
      const verify = async () => {
        const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
          JSON.parse(decodedPCD).pcd
        );

        const verified = await ZKEdDSAEventTicketPCDPackage.verify(pcd);
        if (verified) {
          setTicketId(pcd.claim.partialTicket.ticketId);
          setLoading(false);
        } else {
          setLoading(false);
          setError("Could not verify ticket. Please try scanning again.");
        }
      };

      verify();
    } else {
      setTicketId(id);
      setLoading(false);
    }
  }, [id, query]);

  return { loading, ticketId, error };
}

function TicketErrorContent({ error }: { error: TicketError }) {
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

export function TicketError({ error }: { error: TicketError }) {
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

function ScanAnotherTicket() {
  const onClick = useCallback(() => {
    window.location.href = "/#/scan";
  }, []);

  return (
    <Button style="secondary" onClick={onClick}>
      Scan Another Ticket
    </Button>
  );
}

function Home() {
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

export function UserReadyForCheckin({
  ticketData,
  ticketId
}: {
  ticketData: CheckTicketByIdResponseValue;
  ticketId: string;
}) {
  return (
    <>
      <TicketInfoSection ticketData={ticketData} />
      <CheckInSection ticketId={ticketId} />
    </>
  );
}

export function useCheckTicketById(ticketId: string | undefined):
  | {
      loading: true;
      result: undefined;
    }
  | {
      loading: false;
      result: CheckTicketByIdResult;
    } {
  const [inProgress, setInProgress] = useState(true);
  const [result, setResult] = useState<CheckTicketByIdResult | undefined>();
  const stateContext = useStateContext();

  const doCheckTicketById = useCallback(
    async (ticketId: string | undefined) => {
      if (!ticketId) {
        return;
      } else {
        console.log("checking", ticketId);
      }

      const checkTicketByIdResult = await devconnectCheckByIdWithOffline(
        ticketId,
        stateContext
      );
      setInProgress(false);
      setResult(checkTicketByIdResult);
    },
    [stateContext]
  );

  useEffect(() => {
    doCheckTicketById(ticketId);
  }, [doCheckTicketById, ticketId]);

  if (inProgress) {
    return { loading: true, result: undefined };
  } else {
    return { loading: false, result };
  }
}

function CheckInSection({ ticketId }: { ticketId: string }) {
  const dispatchContext = useStateContext();
  const [inProgress, setInProgress] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);
  const [checkinError, setCheckinError] = useState<TicketError | null>(null);
  const usingLaserScanner = loadUsingLaserScanner();

  const onCheckInClick = useCallback(async () => {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    const checkinResult = await devconnectCheckInByIdWithOffline(
      ticketId,
      dispatchContext
    );
    setInProgress(false);

    if (!checkinResult.success) {
      setFinishedCheckinAttempt(true);
      setCheckinError(checkinResult.error);
    } else {
      setCheckedIn(true);
      setFinishedCheckinAttempt(true);
    }
  }, [inProgress, ticketId, dispatchContext]);

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

function TicketInfoSection({
  ticketData
}: {
  ticketData: CheckTicketByIdResponseValue;
}) {
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
