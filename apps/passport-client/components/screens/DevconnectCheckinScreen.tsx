import {
  CheckInResponse,
  CheckTicketResponse,
  ISSUANCE_STRING,
  TicketError
} from "@pcd/passport-interface";
import { decodeQRPayload, Spacer } from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  getTicketData,
  ITicketData,
  RSATicketPCD,
  RSATicketPCDPackage
} from "@pcd/rsa-ticket-pcd";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { useCallback, useContext, useEffect, useState } from "react";
import { Location, useLocation } from "react-router-dom";
import styled from "styled-components";
import { requestCheckIn, requestCheckTicket } from "../../src/api/checkinApi";
import { DispatchContext } from "../../src/dispatch";
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

  const { loading: checkingTicket, response: checkTicketResponse } =
    useCheckTicket(ticket);

  const ticketData = getTicketData(ticket);

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
    if (checkTicketResponse.success === true) {
      content = <UserReadyForCheckin ticket={ticket} ticketData={ticketData} />;
    } else {
      content = (
        <TicketError
          ticketData={ticketData}
          error={checkTicketResponse.error}
        />
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
            <span>TODO</span>
          </Spread>
        </>
      );
      break;
    case "InvalidSignature":
      errorContent = (
        <>
          <ErrorTitle>Invalid Ticket Signature</ErrorTitle>
          <Spacer h={8} />
          <span>This ticket was not issued by PCDPass.</span>
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
  ticket: RSATicketPCD;
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

function useCheckTicket(ticket: RSATicketPCD | undefined): {
  loading: boolean;
  response: CheckTicketResponse;
} {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<CheckTicketResponse | undefined>();

  useEffect(() => {
    (async () => {
      try {
        if (!ticket) {
          setResponse({ success: false, error: { name: "InvalidTicket" } });
          setLoading(false);
          return;
        }
        setLoading(true);
        const checkResponse = await requestCheckTicket({
          ticket: await RSATicketPCDPackage.serialize(ticket)
        });
        setResponse(checkResponse);
        setLoading(false);
      } catch (e) {
        console.log(e);
        setLoading(false);
        setResponse({ success: false, error: { name: "ServerError" } });
      }
    })();
  }, [ticket]);

  return { loading, response };
}

function CheckInSection({ ticket }: { ticket: RSATicketPCD }) {
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);
  const [state] = useContext(DispatchContext);

  const onCheckInClick = useCallback(() => {
    if (checkingIn) {
      return;
    }
    setCheckingIn(true);
    checkinTicket(state.identity, ticket)
      .then((response) => {
        setCheckedIn(response.success);
        setFinishedCheckinAttempt(true);
        setCheckingIn(false);
      })
      .catch(() => {
        console.log("failed to verify");
        setFinishedCheckinAttempt(true);
        setCheckingIn(false);
      });
  }, [checkingIn, state.identity, ticket]);

  return (
    <CheckinSectionContainer>
      {!checkingIn && !finishedCheckinAttempt && (
        <Button onClick={onCheckInClick}>Check In</Button>
      )}
      {checkingIn && <RippleLoader />}
      {finishedCheckinAttempt && (
        <>
          {checkedIn ? (
            <>
              <CheckinSuccess>Checked In ✅</CheckinSuccess>
              <ScanAnotherTicket />
              <Home />
            </>
          ) : (
            <>
              <CheckinFailure>Failed to check in ❌</CheckinFailure>
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
  ticket: RSATicketPCD | undefined;
  error: Error | undefined;
} {
  const location = useLocation();
  const [ticket, setDecodedPCD] = useState<RSATicketPCD | undefined>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      try {
        const pcd = await decodePCD(location);
        setDecodedPCD(pcd);
      } catch (e) {
        console.log(e);
        setError(e);
      }
    })();
  }, [location, setDecodedPCD]);

  return { ticket, error };
}

async function decodePCD(
  location: Location
): Promise<RSATicketPCD | undefined> {
  try {
    const params = new URLSearchParams(location.search);
    const encodedQRPayload = params.get("pcd");

    console.log(
      `Decoding Devconnect Ticket proof, ${encodedQRPayload.length}b gzip+base64`
    );

    const decodedQrPayload = decodeQRPayload(encodedQRPayload);
    const parsedQrPayload = JSON.parse(decodedQrPayload);
    const decodedPCD = await RSATicketPCDPackage.deserialize(
      parsedQrPayload.pcd
    );
    return decodedPCD;
  } catch (e) {
    console.log("error decoding pcd", e);
  }

  return undefined;
}

async function checkinTicket(
  checkerIdentity: Identity,
  ticket: RSATicketPCD
): Promise<CheckInResponse> {
  try {
    const response = await requestCheckIn({
      ticket: await RSATicketPCDPackage.serialize(ticket),
      checkerProof: await SemaphoreSignaturePCDPackage.serialize(
        await SemaphoreSignaturePCDPackage.prove({
          identity: {
            argumentType: ArgumentTypeName.PCD,
            value: await SemaphoreIdentityPCDPackage.serialize(
              await SemaphoreIdentityPCDPackage.prove({
                identity: checkerIdentity
              })
            )
          },
          signedMessage: {
            argumentType: ArgumentTypeName.String,
            value: ISSUANCE_STRING
          }
        })
      )
    });
    return response;
  } catch (e) {
    console.log("failed to check in", e);
    return { success: false, error: { name: "ServerError" } };
  }
}

const TicketInfoContainer = styled.div`
  padding: 16px;
`;

const Container = styled.div`
  margin-top: 64px;
  color: var(--bg-dark-primary);
  width: 400px;
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
