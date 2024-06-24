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
  hidePadding
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
