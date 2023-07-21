import {
  CheckInResponse,
  CheckTicketResponse,
  ISSUANCE_STRING
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
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { requestCheckIn, requestCheckTicket } from "../../src/api/checkinApi";
import { DispatchContext } from "../../src/dispatch";
import { sleep } from "../../src/util";
import { Button } from "../core";
import { RippleLoader } from "../core/RippleLoader";
import { AppContainer } from "../shared/AppContainer";

export function DevconnectCheckinScreen() {
  const ticket = useDecodedTicket();
  const { loading: checkingTicket, response: checkTicketResponse } =
    useCheckTicket(ticket);
  const ticketData = getTicketData(ticket);

  let content = null;

  if (checkingTicket) {
    content = (
      <div>
        <Spacer h={32} />
        <RippleLoader />
      </div>
    );
  } else {
    if (checkTicketResponse.success) {
      content = <UserReadyForCheckin ticket={ticket} ticketData={ticketData} />;
    } else {
      content = (
        <>
          <AppContainer bg={"primary"}>
            <Container>
              {content}
              <div>
                checking ticket status:{" "}
                {JSON.stringify(checkTicketResponse, null, 2)}
              </div>
            </Container>
          </AppContainer>
        </>
      );
    }
  }

  return <>{content}</>;
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
      <Button onClick={onCheckInClick} disabled={checkingIn}>
        {checkingIn ? "Checking In..." : "Check In"}
      </Button>
      {finishedCheckinAttempt && (
        <>
          {checkedIn ? (
            <CheckinSuccess>Checked In ✅</CheckinSuccess>
          ) : (
            <CheckinFailure>Failed to check in ❌</CheckinFailure>
          )}
        </>
      )}
    </CheckinSectionContainer>
  );
}

function TicketInfoSection({ ticketData }: { ticketData: ITicketData }) {
  return (
    <div>
      <div>{ticketData.eventName}</div>
      <div>{ticketData.ticketName}</div>
      <div>{ticketData.attendeeName}</div>
      <div>{ticketData.attendeeEmail}</div>
    </div>
  );
}

function useDecodedTicket(): RSATicketPCD | undefined {
  const location = useLocation();
  const [decodedPCD, setDecodedPCD] = useState<RSATicketPCD | undefined>();

  useEffect(() => {
    (async () => {
      await sleep(500);
      const pcd = await decodePCD(location);
      setDecodedPCD(pcd);
    })();
  }, [location, setDecodedPCD]);

  return decodedPCD;
}

async function decodePCD(location): Promise<RSATicketPCD | undefined> {
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

async function verifyTicketOnServer(
  checkerIdentity: Identity,
  ticket: RSATicketPCD
): Promise<boolean> {
  try {
    const response = await requestCheckTicket({
      ticket: await RSATicketPCDPackage.serialize(ticket)
    });
    return response.success === true;
  } catch (e) {
    console.log("failed to check in", e);
    return false;
  }
}

const Container = styled.div`
  margin-top: 64px;
  border-radius: 12px;
  border: 1px solid var(--accent-dark);
  background: white;
  color: var(--bg-dark-primary);
  width: 400px;
  padding: 16px;
`;

const RawTicketData = styled.div`
  width: 100%;
  overflow: hidden;
  border: 1px solid black;
  border-radius: 4px;
  padding: 4px;
  white-space: nowrap;
  margin-top: 8px;
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
  margin-top: 8px;
`;
