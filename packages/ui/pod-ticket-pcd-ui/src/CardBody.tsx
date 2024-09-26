import { QRDisplayWithRegenerateAndStorage, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODTicketPCD } from "@pcd/pod-ticket-pcd";
import { useCallback } from "react";
import urlJoin from "url-join";

export interface PODTicketPCDCardProps {
  idBasedVerifyURL: string;
  newUI?: boolean;
}

export const PODTicketPCDUI: PCDUI<PODTicketPCD, PODTicketPCDCardProps> = {
  renderCardBody: PODTicketCardBody
};

function PODTicketCardBody({
  pcd,
  newUI,
  idBasedVerifyURL
}: {
  pcd: PODTicketPCD;
  idBasedVerifyURL: string;
  newUI?: boolean;
}): JSX.Element {
  const ticketData = pcd.claim.ticket;
  const hasImage = pcd.claim.ticket.imageUrl !== undefined;

  if (newUI) {
    return (
      <NEW_UI__Container>
        <div
          style={{
            minWidth: 320,
            minHeight: 320
          }}
        >
          <TicketQR pcd={pcd} idBasedVerifyURL={idBasedVerifyURL} />
        </div>
        <NEW_UI__InfoContainer>
          <NEW_UI__AttendeeName>
            {ticketData?.attendeeName
              ? ticketData.attendeeName.toUpperCase()
              : "JOHN DOE"}
          </NEW_UI__AttendeeName>
          <NEW_UI__ExtraInfoContainer>
            <NEW_UI__ExtraInfo>{ticketData?.attendeeEmail}</NEW_UI__ExtraInfo>
            <NEW_UI__ExtraInfo>•</NEW_UI__ExtraInfo>
            <NEW_UI__ExtraInfo>{ticketData?.ticketName}</NEW_UI__ExtraInfo>
          </NEW_UI__ExtraInfoContainer>
        </NEW_UI__InfoContainer>
      </NEW_UI__Container>
    );
  }
  return (
    <Container>
      {hasImage && (
        <TicketInfo>
          <TicketImage hidePadding={false} pcd={pcd} />
          <span>{ticketData?.attendeeName}</span>
          <span>{ticketData?.attendeeEmail}</span>
        </TicketInfo>
      )}

      {!hasImage && (
        <>
          <TicketQR pcd={pcd} idBasedVerifyURL={idBasedVerifyURL} />
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
        pcd.claim.ticket.ticketId,
        pcd.claim.ticket.eventId
      )
    );
    return linkToTicket(
      idBasedVerifyURL,
      pcd.claim.ticket.ticketId,
      pcd.claim.ticket.eventId
    );
  }, [idBasedVerifyURL, pcd.claim.ticket.eventId, pcd.claim.ticket.ticketId]);

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

function TicketImage({
  pcd,
  hidePadding
}: {
  pcd: PODTicketPCD;
  hidePadding?: boolean;
}): JSX.Element {
  const { imageUrl, imageAltText } = pcd.claim.ticket;
  if (hidePadding) return <img src={imageUrl} alt={imageAltText} />;
  return (
    <div style={{ padding: "8px" }}>
      <img src={imageUrl} alt={imageAltText} />
    </div>
  );
}

const NEW_UI__Container = styled.div`
  font-family: Barlow;
  border-radius: 16px;
  border: 2px solid var(--text-white, #fff);
  background: var(--bg-white-transparent, rgba(255, 255, 255, 0.8));

  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  padding: 16px;
`;

const NEW_UI__InfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`;

const NEW_UI__AttendeeName = styled.div`
  color: #9a4ac9;
  font-size: 20px;
  font-style: normal;
  font-weight: 800;
  line-height: 135%; /* 27px */
`;

const NEW_UI__ExtraInfoContainer = styled.div`
  display: flex;
  gap: 4px;
`;
const NEW_UI__ExtraInfo = styled.div`
  color: var(--text-primary);

  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 135%; /* 18.9px */
`;
