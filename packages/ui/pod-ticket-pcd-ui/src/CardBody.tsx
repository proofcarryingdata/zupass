import { QRDisplayWithRegenerateAndStorage, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODTicketPCD } from "@pcd/pod-ticket-pcd";
import { IPODTicketData } from "@pcd/pod-ticket-pcd/src/schema";
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
  return (
    <PODTicketCardBodyImpl
      ticketData={pcd.claim.ticket}
      idBasedVerifyURL={idBasedVerifyURL}
    />
  );
}

export function PODTicketCardBodyImpl({
  ticketData,
  idBasedVerifyURL
}: {
  ticketData: IPODTicketData;
  idBasedVerifyURL: string;
}): JSX.Element {
  const hasImage = ticketData.imageUrl !== undefined;

  return (
    <Container>
      {hasImage && (
        <TicketInfo>
          <TicketImage hidePadding={false} ticketData={ticketData} />
          <span>{ticketData?.attendeeName}</span>
          <span>{ticketData?.attendeeEmail}</span>
        </TicketInfo>
      )}

      {!hasImage && (
        <>
          <TicketQR
            ticketData={ticketData}
            idBasedVerifyURL={idBasedVerifyURL}
          />
          <TicketInfo>
            <span>{ticketData.attendeeName}</span>
            <span>{ticketData.attendeeEmail}</span>
          </TicketInfo>
        </>
      )}
    </Container>
  );
}
function TicketQR({
  ticketData,
  idBasedVerifyURL
}: {
  ticketData: IPODTicketData;
  idBasedVerifyURL: string;
}): JSX.Element {
  const generate = useCallback(async () => {
    if (
      [
        "53edb3e7-6733-41e0-a9be-488877c5c572", // eth berlin
        "508313ea-f16b-4729-bdf0-281c64493ca9", //  eth prague
        "5074edf5-f079-4099-b036-22223c0c6995" // devcon 7
      ].includes(ticketData.eventId) &&
      ticketData.ticketSecret
    ) {
      return ticketData.ticketSecret;
    }

    return linkToTicket(
      idBasedVerifyURL,
      ticketData.ticketId,
      ticketData.eventId
    );
  }, [
    idBasedVerifyURL,
    ticketData.eventId,
    ticketData.ticketId,
    ticketData.ticketSecret
  ]);

  return (
    <QRDisplayWithRegenerateAndStorage
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={ticketData.ticketId}
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

function TicketImage({
  ticketData,
  hidePadding
}: {
  ticketData: IPODTicketData;
  hidePadding?: boolean;
}): JSX.Element {
  const { imageUrl, imageAltText } = ticketData;
  if (hidePadding) return <img src={imageUrl} alt={imageAltText} />;
  return (
    <div style={{ padding: "8px" }}>
      <img src={imageUrl} alt={imageAltText} />
    </div>
  );
}
