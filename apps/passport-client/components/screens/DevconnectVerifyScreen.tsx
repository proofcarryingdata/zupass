import { decodeQRPayload } from "@pcd/passport-ui";
import {
  getTicketData,
  ITicketData,
  RSATicketPCD,
  RSATicketPCDPackage,
} from "@pcd/rsa-ticket-pcd";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { sleep } from "../../src/util";
import { AppContainer } from "../shared/AppContainer";

export function DevconnectVerifyScreen() {
  const decodedPCD = useDecodedPCD();
  const ticketData = getTicketData(decodedPCD);

  return (
    <AppContainer bg={"primary"}>
      <Container>
        <TicketInfoSection ticketData={ticketData} />
        <RawTicketData>{JSON.stringify(decodedPCD)}</RawTicketData>
      </Container>
    </AppContainer>
  );
}

function TicketInfoSection({ ticketData }: { ticketData: ITicketData }) {
  return (
    <div>
      <div>{ticketData.eventName}</div>
      <div>{ticketData.ticketName}</div>
      <div>{ticketData.attendeeName}</div>
      <div>{ticketData.attendeeEmail}</div>
      <div>{ticketData.timestamp}</div>
    </div>
  );
}

function useDecodedPCD(): RSATicketPCD | undefined {
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
