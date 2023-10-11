import {
  CheckTicketByIdResponseValue,
  CheckTicketByIdResult,
  TicketError,
  checkinTicketById,
  requestCheckTicketById
} from "@pcd/passport-interface";
import { Spacer } from "@pcd/passport-ui";
import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useIdentity, useQuery } from "../../src/appHooks";
import { Button, H5 } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../shared/PCDCard";

export function DevconnectCheckinByIdScreen() {
  const query = useQuery();
  const ticketId = query?.get("id");

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

  return <>{content}</>;
}

function TicketError({ error }: { error: TicketError }) {
  let errorContent = null;

  console.log(error);
  switch (error.name) {
    case "AlreadyCheckedIn":
      errorContent = (
        <>
          <ErrorTitle>This ticket has already been checked in</ErrorTitle>
          <Spacer h={8} />
          <Spread>
            <span>Checked in at</span>
            <span>{error.checkinTimestamp}</span>
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
          <ErrorTitle>
            You are not authorized to check this ticket in
          </ErrorTitle>
          <Spacer h={8} />
          <span>This event is: ""</span>
          <div>The events you are able to check in are:</div>
          <div>- a</div>
          <div>- b</div>
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

  return (
    <AppContainer bg={"primary"}>
      <Container>
        <ErrorContainer>{errorContent}</ErrorContainer>
        <div
          style={{
            marginTop: "16px",
            width: "100%"
          }}
        >
          <ScanAnotherTicket />
          <Home />
        </div>
      </Container>
    </AppContainer>
  );
}

function ScanAnotherTicket() {
  const onClick = useCallback(() => {
    window.location.href = "/#/scan";
  }, []);

  return <Button onClick={onClick}>Scan Another Ticket</Button>;
}

function Home() {
  const onClick = useCallback(() => {
    window.location.href = "/#/";
  }, []);

  return (
    <>
      <Spacer h={8} />
      <Button onClick={onClick}>Home</Button>
    </>
  );
}

function UserReadyForCheckin({
  ticketData,
  ticketId
}: {
  ticketData: CheckTicketByIdResponseValue;
  ticketId: string;
}) {
  return (
    <AppContainer bg={"primary"}>
      <Container>
        <TicketInfoSection ticketData={ticketData} />
        <CheckInSection ticketId={ticketId} />
      </Container>
    </AppContainer>
  );
}

function useCheckTicketById(ticketId: string | undefined):
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

  const checkTicketById = useCallback(async (ticketId: string | undefined) => {
    if (!ticketId) {
      return;
    } else {
      console.log("checking", ticketId);
    }

    const checkTicketByIdResult = await requestCheckTicketById(
      appConfig.zupassServer,
      {
        ticketId
      }
    );
    setInProgress(false);
    setResult(checkTicketByIdResult);
  }, []);

  useEffect(() => {
    checkTicketById(ticketId);
  }, [checkTicketById, ticketId]);

  if (inProgress) {
    return { loading: true, result: undefined };
  } else {
    return { loading: false, result };
  }
}

function CheckInSection({ ticketId }: { ticketId: string }) {
  const [inProgress, setInProgress] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);
  const identity = useIdentity();

  const onCheckInClick = useCallback(async () => {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    const checkinResult = await checkinTicketById(
      appConfig.zupassServer,
      ticketId,
      identity
    );
    setInProgress(false);

    if (!checkinResult.success) {
      // todo: display error better
      setFinishedCheckinAttempt(true);
    } else {
      setCheckedIn(true);
      setFinishedCheckinAttempt(true);
    }
  }, [inProgress, identity, ticketId]);

  return (
    <CheckinSectionContainer>
      {!inProgress && !finishedCheckinAttempt && (
        <Button onClick={onCheckInClick}>Check In</Button>
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
              <Home />
            </>
          ) : (
            <>
              <StatusContainer style={{ backgroundColor: "#ffd4d4" }}>
                <CheckinFailure>Failed to check in ❌</CheckinFailure>
              </StatusContainer>
              <ScanAnotherTicket />
              <Home />
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

const CheckinFailure = styled.span`
  color: red;
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
