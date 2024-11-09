import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  TicketCategory,
  getEdDSATicketData
} from "@pcd/eddsa-ticket-pcd";
import { ZUCONNECT_23_DAY_PASS_PRODUCT_ID } from "@pcd/passport-interface";
import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { useRef } from "react";
import { TicketQR } from "./TicketQR";

type NEW_UI__AddOns = {
  onClick: () => void;
  text: string;
};
export interface EdDSATicketPCDCardProps {
  // The URL to use when encoding a serialized PCD on the query string.
  verifyURL: string;
  // The URL to use for the simpler case of sending some identifiers rather
  // than a whole serialized ZkEdDSAEventTicketPCD.
  // This can be useful to ensure the smallest possible QR code payload.
  // If this parameter is set, then the default QR code will use this URL.
  // "ZK mode" will then be enabled, allowing the user to switch to using the
  // `verifyURL` with a ZK proof of their ticket as the payload.
  idBasedVerifyURL?: string;
  // If true, hides the visual padding around the image
  hidePadding?: boolean;
  // when clicked on the the addons sections, if there is any, do something
  addOns?: NEW_UI__AddOns;
}

export const EdDSATicketPCDUI: PCDUI<EdDSATicketPCD, EdDSATicketPCDCardProps> =
  {
    renderCardBody: EdDSATicketPCDCardBody,
    getHeader
  };

function EdDSATicketPCDCardBody({
  pcd,
  verifyURL,
  idBasedVerifyURL,
  addOns
}: {
  pcd: EdDSATicketPCD;
} & EdDSATicketPCDCardProps): JSX.Element {
  const ticketImageRef = useRef<HTMLDivElement>(null);
  const ticketData = getEdDSATicketData(pcd);

  // If ticket has an `eventStartDate` render the `qrCodeOverrideImageUrl`, if it exists
  // Else, render the `imageUrl`, if it existss
  const imageToRender =
    ticketData?.eventStartDate && idBasedVerifyURL !== undefined
      ? ticketData.qrCodeOverrideImageUrl
      : ticketData?.imageUrl;

  return (
    <NEW_UI__Container>
      <NEW_UI__TicketImageContainer ref={ticketImageRef}>
        {!imageToRender && (
          <TicketQR
            pcd={pcd}
            verifyURL={verifyURL}
            idBasedVerifyURL={idBasedVerifyURL}
          />
        )}
        {imageToRender && (
          <TicketImage
            imageUrl={imageToRender}
            imageAltText={ticketData?.imageAltText}
            hidePadding={true}
          />
        )}
        <NEW_UI__InfoContainer>
          <NEW_UI__AttendeeName>
            {ticketData?.attendeeName.toUpperCase() ||
              ticketData?.eventName.toUpperCase() ||
              "Unknown"}
          </NEW_UI__AttendeeName>
          <NEW_UI__ExtraInfoContainer>
            {ticketData?.attendeeEmail && (
              <NEW_UI__ExtraInfo>{ticketData.attendeeEmail}</NEW_UI__ExtraInfo>
            )}
            {ticketData?.attendeeEmail && ticketData?.ticketName && (
              <NEW_UI__ExtraInfo>•</NEW_UI__ExtraInfo>
            )}
            {ticketData?.ticketName && (
              <NEW_UI__ExtraInfo>{ticketData.ticketName}</NEW_UI__ExtraInfo>
            )}
          </NEW_UI__ExtraInfoContainer>
        </NEW_UI__InfoContainer>
      </NEW_UI__TicketImageContainer>
      <div>
        {addOns && (
          <NEW_UI__ExtraSection onClick={addOns.onClick}>
            <NEW_UI__ExtraSectionText>{addOns.text}</NEW_UI__ExtraSectionText>
            <QRIcon />
          </NEW_UI__ExtraSection>
        )}
        <NEW_UI__ExtraSection
          style={{ justifyContent: "center", cursor: "default" }}
        >
          <ExtraSectionSecondaryText>
            QR POD • ZK powered by ZUPASS
          </ExtraSectionSecondaryText>
        </NEW_UI__ExtraSection>
      </div>
    </NEW_UI__Container>
  );
}

function TicketImage({
  imageUrl,
  imageAltText,
  hidePadding
}: {
  imageUrl: string;
  imageAltText: string | undefined;
  hidePadding?: boolean;
}): JSX.Element {
  if (hidePadding) return <img src={imageUrl} alt={imageAltText} />;
  return (
    <div style={{ padding: "8px" }}>
      <img src={imageUrl} alt={imageAltText} />
    </div>
  );
}

function getHeader({ pcd }: { pcd: EdDSATicketPCD }): JSX.Element {
  let header;
  if (
    pcd.claim.ticket.ticketCategory === TicketCategory.ZuConnect &&
    pcd.claim.ticket.productId === ZUCONNECT_23_DAY_PASS_PRODUCT_ID
  ) {
    header = "ZUCONNECT '23 DAY PASS";
  } else {
    header = EdDSATicketPCDPackage.getDisplayOptions?.(pcd).header ?? "";
  }

  return <Uppercase>{header}</Uppercase>;
}

const Uppercase = styled.span`
  text-transform: uppercase;
`;

const NEW_UI__Container = styled.div`
  font-family: Rubik;
  border-radius: 16px;
  border: 2px solid var(--text-white, #fff);
  background: #fff;

  /* shadow-sm */
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const NEW_UI__TicketImageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 16px 0px 16px;
  background: var(--bg-white-transparent, rgba(255, 255, 255, 0.8));
  border-radius: inherit;
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
  padding: 16px;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  &:focus {
    outline: none;
    background-color: "var(--text-tertiary)";
  }
  &:active {
    background-color: "var(--text-tertiary)";
  }
`;

const NEW_UI__ExtraSectionText = styled.div<{ $disabled?: boolean }>`
  color: ${({ $disabled }): string =>
    $disabled ? "var(--text-tertiary)" : "var(--text-primary)"};
  font-family: Rubik;
  font-size: 16px;
  font-weight: 400;
  line-height: 135%;
`;

const ExtraSectionSecondaryText = styled.div`
  color: var(--text-tertiary);
  text-align: center;

  /* text-xs (12px)/regular-rubik */
  font-family: Rubik;
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 135%; /* 16.2px */
`;

const QRIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="var(--text-tertiary)"
    className="size-4"
    width={20}
    height={20}
  >
    <path d="M4.75 4.25a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z" />
    <path
      fillRule="evenodd"
      d="M2 3.5A1.5 1.5 0 0 1 3.5 2H6a1.5 1.5 0 0 1 1.5 1.5V6A1.5 1.5 0 0 1 6 7.5H3.5A1.5 1.5 0 0 1 2 6V3.5Zm1.5 0H6V6H3.5V3.5Z"
      clipRule="evenodd"
    />
    <path d="M4.25 11.25a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0Z" />
    <path
      fillRule="evenodd"
      d="M2 10a1.5 1.5 0 0 1 1.5-1.5H6A1.5 1.5 0 0 1 7.5 10v2.5A1.5 1.5 0 0 1 6 14H3.5A1.5 1.5 0 0 1 2 12.5V10Zm1.5 2.5V10H6v2.5H3.5Z"
      clipRule="evenodd"
    />
    <path d="M11.25 4.25a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z" />
    <path
      fillRule="evenodd"
      d="M10 2a1.5 1.5 0 0 0-1.5 1.5V6A1.5 1.5 0 0 0 10 7.5h2.5A1.5 1.5 0 0 0 14 6V3.5A1.5 1.5 0 0 0 12.5 2H10Zm2.5 1.5H10V6h2.5V3.5Z"
      clipRule="evenodd"
    />
    <path d="M8.5 9.417a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0ZM8.5 13.083a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0ZM13.083 8.5a.917.917 0 1 0 0 1.833.917.917 0 0 0 0-1.833ZM12.166 13.084a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0ZM11.25 10.333a.917.917 0 1 0 0 1.833.917.917 0 0 0 0-1.833Z" />
  </svg>
);
