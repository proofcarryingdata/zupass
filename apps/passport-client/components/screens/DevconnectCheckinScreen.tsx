import { CheckTicketResponse } from "@pcd/passport-interface";
import { decodeQRPayload } from "@pcd/passport-ui";
import {
  getTicketData,
  ITicketData,
  RSATicketPCD,
  RSATicketPCDPackage
} from "@pcd/rsa-ticket-pcd";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { requestCheckIn, requestCheckTicket } from "../../src/api/checkinApi";
import { sleep } from "../../src/util";
import { Button } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function DevconnectCheckinScreen() {
  const ticket = useDecodedTicket();
  const { loading: checkingTicket, response: checkTicketResponse } =
    useCheckTicket(ticket);
  const ticketData = getTicketData(ticket);

  return (
    <AppContainer bg={"primary"}>
      <Container>
        <div>
          checking ticket: {checkingTicket}
          <br />
          checking ticket status: {JSON.stringify(checkTicketResponse, null, 2)}
        </div>
        <TicketHeaderSection ticketData={ticketData} />
        <TicketInfoSection ticketData={ticketData} />
        <RawTicketData>{JSON.stringify(ticket)}</RawTicketData>
        {ticket && <CheckInSection ticket={ticket} />}
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
  const [checkedIn, setCheckedIn] = useState(false);
  const [finishedCheckinAttempt, setFinishedCheckinAttempt] = useState(false);

  const onVerifyClick = useCallback(() => {
    verifyTicketOnServer(ticket)
      .then((valid) => {
        setCheckedIn(valid);
        setFinishedCheckinAttempt(true);
      })
      .catch(() => {
        console.log("failed to verify");
        setFinishedCheckinAttempt(true);
      });
  }, [ticket]);

  return (
    <CheckinSectionContainer>
      <Button onClick={onVerifyClick}>Check in</Button>
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

function TicketHeaderSection({ ticketData }: { ticketData: ITicketData }) {
  if (ticketData.isRevoked) {
    return <div>This ticket has been canceled 💀</div>;
  }
  if (ticketData.isConsumed) {
    return <div>This ticket has already been scanned 😬</div>;
  }
  return <div>Please check in below!</div>;
}

function TicketInfoSection({ ticketData }: { ticketData: ITicketData }) {
  return (
    <div>
      <div>{ticketData.eventName}</div>
      <div>{ticketData.ticketName}</div>
      <div>{ticketData.attendeeName}</div>
      <div>{ticketData.attendeeEmail}</div>
      <div>{ticketData.timestamp}</div>
      <div>{ticketData.eventConfigId}</div>
      <div>{ticketData.ticketId}</div>
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

async function verifyTicketOnServer(ticket: RSATicketPCD): Promise<boolean> {
  try {
    const response = await requestCheckIn({
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
  min-height: 300px;
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
