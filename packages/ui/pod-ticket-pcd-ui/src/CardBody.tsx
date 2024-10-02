import { QRDisplayWithRegenerateAndStorage, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { PODTicketPCD } from "@pcd/pod-ticket-pcd";
import { IPODTicketData } from "@pcd/pod-ticket-pcd/src/schema";
import { useCallback } from "react";
import urlJoin from "url-join";

type NEW_UI__AddOns = {
  onClick: () => void;
  text: string;
};
export interface PODTicketPCDCardProps {
  ticketData: IPODTicketData;
  pcd: PODTicketPCD;
  idBasedVerifyURL: string;
  newUI?: boolean;
  addOns?: NEW_UI__AddOns;
}

export const PODTicketPCDUI: PCDUI<PODTicketPCD, PODTicketPCDCardProps> = {
  renderCardBody: PODTicketCardBody
};

function PODTicketCardBody({
  pcd,
  newUI,
  idBasedVerifyURL,
  addOns
}: {
  pcd: PODTicketPCD;
  idBasedVerifyURL: string;
  newUI?: boolean;
  addOns?: NEW_UI__AddOns;
}): JSX.Element {
  return (
    <PODTicketCardBodyImpl
      pcd={pcd}
      ticketData={pcd.claim.ticket}
      idBasedVerifyURL={idBasedVerifyURL}
      newUI={newUI}
      addOns={addOns}
    />
  );
}

export function PODTicketCardBodyImpl({
  ticketData,
  idBasedVerifyURL,
  newUI,
  pcd,
  addOns
}: PODTicketPCDCardProps): JSX.Element {
  const hasImage = ticketData.imageUrl !== undefined;

  if (newUI) {
    const data = Buffer.from(
      JSON.stringify(
        pcd,
        (_, v) => (typeof v === "bigint" ? v.toString() : v),

        2
      )
    );
    const blob = new Blob([data], { type: "plain/json" });

    return (
      <NEW_UI__Container>
        <TicketQR ticketData={ticketData} idBasedVerifyURL={idBasedVerifyURL} />
        <NEW_UI__InfoContainer>
          <NEW_UI__AttendeeName>
            {ticketData?.attendeeName.toUpperCase() || "Unknown"}
          </NEW_UI__AttendeeName>
          <NEW_UI__ExtraInfoContainer>
            <NEW_UI__ExtraInfo>{ticketData?.attendeeEmail}</NEW_UI__ExtraInfo>
            <NEW_UI__ExtraInfo>•</NEW_UI__ExtraInfo>
            <NEW_UI__ExtraInfo>{ticketData?.ticketName}</NEW_UI__ExtraInfo>
          </NEW_UI__ExtraInfoContainer>
        </NEW_UI__InfoContainer>
        <div>
          <NEW_UI__ExtraSection
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download =
                (ticketData?.eventName || "event-ticket-data") + ".json";
              a.click();
              a.remove();
            }}
          >
            <NEW_UI__ExtraSectionText>Download ticket</NEW_UI__ExtraSectionText>
            <DownloadIcon />
          </NEW_UI__ExtraSection>
          {addOns && (
            <NEW_UI__ExtraSection onClick={addOns.onClick}>
              <NEW_UI__ExtraSectionText>{addOns.text}</NEW_UI__ExtraSectionText>
              <QRIcon />
            </NEW_UI__ExtraSection>
          )}
        </div>
      </NEW_UI__Container>
    );
  }
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
export function TicketQR({
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

const NEW_UI__Container = styled.div`
  font-family: Rubik;
  border-radius: 16px;
  border: 2px solid var(--text-white, #fff);
  background: var(--bg-white-transparent, rgba(255, 255, 255, 0.8));

  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  font-family: Barlow, sans-serif;
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

const NEW_UI__ExtraSection = styled.div`
  display: flex;
  flex-direction: row;
  border-top: 1px solid #eee;
  padding: 16px 0;
  justify-content: space-between;
`;

const NEW_UI__ExtraSectionText = styled.div`
  color: var(--text-primary);
  font-family: Rubik;
  font-size: 16px;
  font-weight: 400;
  line-height: 135%;
`;

const DownloadIcon = (): JSX.Element => (
  <svg
    width={20}
    height={20}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="var(--text-tertiary)"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const QRIcon = (): JSX.Element => (
  <svg
    width={20}
    height={20}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="var(--text-tertiary)"
    className="size-6"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
    />
  </svg>
);
