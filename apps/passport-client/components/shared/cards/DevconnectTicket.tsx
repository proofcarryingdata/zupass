import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  getQRCodeColorOverride
} from "@pcd/eddsa-ticket-pcd";
import {
  QRDisplayWithRegenerateAndStorage,
  Spacer,
  encodeQRPayload
} from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { usePCDCollection } from "../../../src/appHooks";
import { RedactedText } from "../../core/RedactedText";
import { ToggleSwitch } from "../../core/Toggle";
import { icons } from "../../icons";

function makeTicketIdVerifyLink(ticketId: string): string {
  const link = `${
    window.location.origin
  }/#/checkin-by-id?id=${encodeURIComponent(ticketId)}`;
  return link;
}

function makeTicketIdPCDVerifyLink(pcdStr: string): string {
  const link = `${window.location.origin}/#/verify?pcd=${encodeURIComponent(
    pcdStr
  )}`;
  return link;
}

/**
 * Renders a QR code. Can render either the simple QR code with the ticket ID
 * for check-in, or a ZK QR code which (currently) goes to the "verify" screen.
 * We might want this to go to the check-in screen, but this raises some
 * interesting questions about what to do when attendees start scanning each
 * other's ZK QR codes.
 */
function TicketQR({ pcd, zk }: { pcd: EdDSATicketPCD; zk: boolean }) {
  const pcds = usePCDCollection();

  const generate = useCallback(async () => {
    if (zk) {
      const serializedTicketPCD = await EdDSATicketPCDPackage.serialize(pcd);
      const serializedIdentityPCD = await SemaphoreIdentityPCDPackage.serialize(
        pcds.getPCDsByType(SemaphoreIdentityPCDPackage.name)[0]
      );
      const zkPCD = await ZKEdDSAEventTicketPCDPackage.prove({
        ticket: {
          value: serializedTicketPCD,
          argumentType: ArgumentTypeName.PCD
        },
        identity: {
          value: serializedIdentityPCD,
          argumentType: ArgumentTypeName.PCD
        },
        fieldsToReveal: {
          value: {
            revealEventId: true,
            revealProductId: true,
            revealTicketId: true,
            revealTicketCategory: true
          },
          argumentType: ArgumentTypeName.ToggleList
        },
        validEventIds: {
          value: [pcd.claim.ticket.eventId],
          argumentType: ArgumentTypeName.StringArray
        },
        externalNullifier: {
          value: undefined,
          argumentType: ArgumentTypeName.BigInt
        },
        watermark: {
          value: Date.now().toString(),
          argumentType: ArgumentTypeName.BigInt
        }
      });
      const serializedZKPCD =
        await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);
      const verificationLink = makeTicketIdPCDVerifyLink(
        encodeQRPayload(JSON.stringify(serializedZKPCD))
      );
      return verificationLink;
    } else {
      const ticketId = pcd.claim.ticket.ticketId;
      const verificationLink = makeTicketIdVerifyLink(ticketId);
      return verificationLink;
    }
  }, [pcd, pcds, zk]);

  if (zk) {
    return (
      <QRDisplayWithRegenerateAndStorage
        // Key is necessary so that React notices that this isn't the non-ZK
        // QR code component.
        key={`zk-${pcd.id}`}
        generateQRPayload={generate}
        loadingLogo={
          <LoadingIconContainer>
            <LoadingIcon src={icons.qrCenterLoading} />
          </LoadingIconContainer>
        }
        maxAgeMs={1000 * 60}
        // QR codes are cached by ID, so we need to distinguish the ZK version
        // by this prefix.
        uniqueId={`zk-${pcd.id}`}
        fgColor={getQRCodeColorOverride(pcd)}
      />
    );
  } else {
    return (
      <QRDisplayWithRegenerateAndStorage
        key={pcd.id}
        generateQRPayload={generate}
        maxAgeMs={1000 * 60}
        uniqueId={pcd.id}
        fgColor={getQRCodeColorOverride(pcd)}
      />
    );
  }
}

export function DevconnectCardBody({ pcd }: { pcd: EdDSATicketPCD }) {
  const [zk, setZk] = useState<boolean>(false);
  const onToggle = useCallback(() => {
    setZk(!zk);
  }, [zk]);
  const ticketData = pcd.claim.ticket;
  return (
    <Container>
      <TicketInfo>
        <TicketQR zk={zk} pcd={pcd} />
        <Spacer h={8} />
        {ticketData?.attendeeName && (
          <RedactedText redacted={zk}>{ticketData?.attendeeName}</RedactedText>
        )}
        <RedactedText redacted={zk}>{ticketData?.attendeeEmail}</RedactedText>
        <ZKMode>
          <ToggleSwitch label="ZK mode" checked={zk} onChange={onToggle} />
        </ZKMode>
      </TicketInfo>
    </Container>
  );
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

const ZKMode = styled.div`
  display: flex;
  text-align: right;
  margin-top: 8px;
  padding: 0px 16px;
  width: 100%;
  justify-content: flex-end;
`;

const LoadingIconContainer = styled.div`
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoadingIcon = styled.img`
  height: 100px;
  width: 100px;
`;
