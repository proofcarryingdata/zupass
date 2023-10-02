import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  getEdDSATicketData,
  ITicketData
} from "@pcd/eddsa-ticket-pcd";
import {
  checkinTicket,
  CheckTicketResult,
  requestCheckTicket,
  TicketError
} from "@pcd/passport-interface";
import { decodeQRPayload, Spacer } from "@pcd/passport-ui";
import { getErrorMessage } from "@pcd/util";
import { useCallback, useEffect, useState } from "react";
import { Location, useLocation } from "react-router-dom";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { useIdentity } from "../../src/appHooks";
import { Button, H5 } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";
import {
  CardBodyContainer,
  CardHeader,
  CardOutlineExpanded
} from "../shared/PCDCard";

export function DevconnectCheckinScreen() {
  const { ticket, error: decodeError } = useDecodedTicket();
  const { loading: checkingTicket, result: checkTicketResult } =
    useCheckTicket(ticket);

  const ticketData = getEdDSATicketData(ticket);

  let content = null;

  if (decodeError) {
    content = (
      <TicketError ticketData={ticketData} error={{ name: "InvalidTicket" }} />
    );
  } else if (checkingTicket) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else {
    if (checkTicketResult.success) {
      content = <UserReadyForCheckin ticket={ticket} ticketData={ticketData} />;
    } else {
      content = (
        <TicketError ticketData={ticketData} error={checkTicketResult.error} />
      );
    }
  }

  return <>{content}</>;
}

function TicketError({
  ticketData,
  error
}: {
  ticketData: ITicketData;
  error: TicketError;
}) {
  let errorContent = null;
  let showTicket = true;

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
      showTicket = false;
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
        {showTicket && <TicketInfoSection ticketData={ticketData} />}
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
  ticket
}: {
  ticketData: ITicketData;
  ticket: EdDSATicketPCD;
}) {
  return (
    <AppContainer bg={"primary"}>
      <Container>
        <TicketInfoSection ticketData={ticketData} />
        <CheckInSection ticket={ticket} />
      </Container>
    </AppContainer>
  );
}

function useCheckTicket(ticket: EdDSATicketPCD | undefined): {
  loading: boolean;
  result: CheckTicketResult;
} {
  const [inProgress, setInProgress] = useState(true);
  const [result, setResult] = useState<CheckTicketResult | undefined>();

  const checkTicket = useCallback(
    async (ticket: EdDSATicketPCD | undefined) => {
      if (!ticket) {
        return;
      } else {
        console.log("checking", ticket);
      }

      const checkTicketResult = await requestCheckTicket(
        appConfig.zupassServer,
        {
          ticket: await EdDSATicketPCDPackage.serialize(ticket)
        }
      );
      setInProgress(false);
      setResult(checkTicketResult);
    },
    []
  );

  useEffect(() => {
    checkTicket(ticket);
  }, [checkTicket, ticket]);

  return { loading: inProgress, result };
}

function CheckInSection({ ticket }: { ticket: EdDSATicketPCD }) {
  const [inProgress, setInProgress] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);
  const identity = useIdentity();

  const onCheckInClick = useCallback(async () => {
    if (inProgress) {
      return;
    }

    setInProgress(true);
    const checkinResult = await checkinTicket(
      appConfig.zupassServer,
      ticket,
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
  }, [inProgress, identity, ticket]);

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

function TicketInfoSection({ ticketData }: { ticketData: ITicketData }) {
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

function useDecodedTicket(): {
  ticket: EdDSATicketPCD | undefined;
  error: string;
} {
  const location = useLocation();
  const [ticket, setDecodedPCD] = useState<EdDSATicketPCD | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        const pcd = await decodePCD(location);
        setDecodedPCD(pcd);
        console.log("decoded ticket", pcd);
      } catch (e) {
        console.log(e);
        setError(getErrorMessage(e));
      }
    })();
  }, [location, setDecodedPCD]);

  return { ticket, error };
}

async function decodePCD(
  location: Location
): Promise<EdDSATicketPCD | undefined> {
  try {
    const params = new URLSearchParams(location.search);
    const encodedQRPayload = params.get("pcd");

    console.log(
      `Decoding Devconnect Ticket proof, ${encodedQRPayload.length}b gzip+base64`
    );

    const decodedQrPayload = decodeQRPayload(encodedQRPayload);
    const parsedQrPayload = JSON.parse(decodedQrPayload);
    const decodedPCD = await EdDSATicketPCDPackage.deserialize(
      parsedQrPayload.pcd
    );
    return decodedPCD;
  } catch (e) {
    console.log("error decoding pcd", e);
  }

  return undefined;
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
