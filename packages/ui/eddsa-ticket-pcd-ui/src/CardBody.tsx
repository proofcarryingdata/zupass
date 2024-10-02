import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  TicketCategory,
  getEdDSATicketData
} from "@pcd/eddsa-ticket-pcd";
import { ZUCONNECT_23_DAY_PASS_PRODUCT_ID } from "@pcd/passport-interface";
import {
  FlattenSimpleInterpolation,
  Spacer,
  ToggleSwitch,
  css,
  styled
} from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { useCallback, useState } from "react";
import { TicketQR } from "./TicketQR";
type NEW_UI__AddOns = {
  onClick: () => void;
  text: string;
};
export interface EdDSATicketPCDCardProps {
  // The user's Semaphore identity is necessary for generating a ZK proof from
  // the EdDSATicketPCD.
  identityPCD: SemaphoreIdentityPCD;
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
  // Temporary
  newUI?: boolean;
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
  identityPCD,
  verifyURL,
  idBasedVerifyURL,
  hidePadding,
  newUI,
  addOns
}: {
  pcd: EdDSATicketPCD;
} & EdDSATicketPCDCardProps): JSX.Element {
  const hasImage = pcd.claim.ticket.imageUrl !== undefined;

  const ticketData = getEdDSATicketData(pcd);

  const [zk, setZk] = useState<boolean>(idBasedVerifyURL === undefined);

  const onToggle = useCallback(() => {
    setZk(!zk);
  }, [zk]);

  const redact = zk && idBasedVerifyURL !== undefined;
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
        <TicketQR
          pcd={pcd}
          identityPCD={identityPCD}
          verifyURL={verifyURL}
          idBasedVerifyURL={idBasedVerifyURL}
          zk={zk}
        />
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
    <Container padding={!hasImage}>
      {hasImage && (
        <TicketInfo>
          <TicketImage hidePadding={hidePadding} pcd={pcd} />
          <span>{ticketData?.attendeeName}</span>
          <span>{ticketData?.attendeeEmail}</span>
        </TicketInfo>
      )}
      {!hasImage && (
        <TicketInfo>
          <TicketQR
            pcd={pcd}
            identityPCD={identityPCD}
            verifyURL={verifyURL}
            idBasedVerifyURL={idBasedVerifyURL}
            zk={zk}
          />
          <Spacer h={8} />
          {ticketData?.attendeeName && (
            <RedactedText redacted={redact}>
              {ticketData?.attendeeName}
            </RedactedText>
          )}
          <RedactedText redacted={redact}>
            {ticketData?.attendeeEmail}
          </RedactedText>
          {/* TODO: Turn on ZK mode when we have an end-to-end story for it. */}
          {false && (
            <ZKMode>
              <ToggleSwitch label="ZK mode" checked={zk} onChange={onToggle} />
            </ZKMode>
          )}
        </TicketInfo>
      )}
    </Container>
  );
}

function TicketImage({
  pcd,
  hidePadding
}: {
  pcd: EdDSATicketPCD;
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

const Container = styled.span<{ padding: boolean }>`
  ${({ padding }): FlattenSimpleInterpolation =>
    padding
      ? css`
          padding: 16px;
        `
      : css``}
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

const Uppercase = styled.span`
  text-transform: uppercase;
`;

const RedactedText = styled.div<{ redacted: boolean }>`
  ${({ redacted }): FlattenSimpleInterpolation =>
    redacted
      ? css`
          color: transparent;
          &:before {
            border-radius: 4px;
            background-color: var(--bg-dark-primary);
            color: var(--bg-dark-primary);
            content: "REDACTED";
            color: white;
            font-weight: bold;
            min-width: 100%;
            text-align: center;
            position: absolute;
            left: 0;
          }
        `
      : css``}

  margin-bottom: 4px;
  padding: 2px;
  width: 300px;
  position: relative;
  text-align: center;
  transition-property: color, background-color;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  /* Same duration as the toggle slide */
  transition-duration: 300ms;
`;

const ZKMode = styled.div`
  display: flex;
  text-align: right;
  margin-top: 8px;
  padding: 0px 16px;
  width: 100%;
  justify-content: flex-end;
`;

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
