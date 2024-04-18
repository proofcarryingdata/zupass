import { QRDisplayWithRegenerateAndStorage, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODTicketPCD } from "@pcd/pod-ticket-pcd";
import { useCallback } from "react";
import urlJoin from "url-join";

export interface PODTicketPCDCardProps {
  idBasedVerifyURL: string;
}

export const PODTicketPCDUI: PCDUI<PODTicketPCD, PODTicketPCDCardProps> = {
  renderCardBody: PODTicketCardBody
};

function PODTicketCardBody({
  pcd,
  idBasedVerifyURL
}: {
  pcd: PODTicketPCD;
  idBasedVerifyURL: string;
}): JSX.Element {
  const ticketData = pcd.claim.data;

  return (
    <Container>
      <TicketQR pcd={pcd} idBasedVerifyURL={idBasedVerifyURL} />

      <TicketInfo>
        <span>{ticketData.attendeeName}</span>
        <span>{ticketData.attendeeEmail}</span>
      </TicketInfo>
    </Container>
  );
}

function TicketQR({
  pcd,
  idBasedVerifyURL
}: {
  pcd: PODTicketPCD;
  idBasedVerifyURL: string;
}): JSX.Element {
  const generate = useCallback(async () => {
    console.log(
      linkToTicket(
        idBasedVerifyURL,
        pcd.claim.data.ticketId,
        pcd.claim.data.eventId
      )
    );
    return linkToTicket(
      idBasedVerifyURL,
      pcd.claim.data.ticketId,
      pcd.claim.data.eventId
    );
  }, [idBasedVerifyURL, pcd.claim.data.eventId, pcd.claim.data.ticketId]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
    />
  );
}

function makeIdBasedVerifyLink(baseUrl: string, ticketId: string): string {
  return urlJoin(baseUrl, `?id=${ticketId}`);
}

export function linkToTicket(
  baseUrl: string,
  ticketId: string,
  eventId: string
): string {
  const encodedId = Buffer.from(
    JSON.stringify({
      ticketId: ticketId,
      eventId: eventId,
      timestamp: Date.now().toString()
    })
  ).toString("base64");
  return makeIdBasedVerifyLink(baseUrl, encodedId);
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const TicketInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
