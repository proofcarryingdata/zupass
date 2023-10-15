import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  getQRCodeColorOverride
} from "@pcd/eddsa-ticket-pcd";
import {
  QRDisplayWithRegenerateAndStorage,
  encodeQRPayload
} from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback } from "react";
import styled from "styled-components";
import { usePCDCollection } from "../../../src/appHooks";
import { makeEncodedVerifyLink } from "../../../src/qr";
import { icons } from "../../icons";

/**
 * Generates a ZK proof and uses this to generate the QR code.
 * This overrides the normal rendering of an EdDSATicketPCD, and is
 * done here to avoid circular dependencies between EdDSATicketPCD and
 * ZKEdDSAEventTicketPCD.
 */
function TicketQR({ pcd }: { pcd: EdDSATicketPCD }) {
  const pcds = usePCDCollection();
  const generate = useCallback(async () => {
    console.log(`[QR] generating proof, timestamp ${Date.now()}`);
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
          revealTicketId: true,
          revealEventId: true,
          revealProductId: true
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
    const serializedZKPCD = await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);
    const verificationLink = makeEncodedVerifyLink(
      encodeQRPayload(JSON.stringify(serializedZKPCD))
    );
    return verificationLink;
  }, [pcd, pcds]);

  return (
    <QRDisplayWithRegenerateAndStorage
      loadingLogo={
        <LoadingIconContainer>
          <LoadingIcon src={icons.qrCenterLoading} />
        </LoadingIconContainer>
      }
      generateQRPayload={generate}
      maxAgeMs={1000 * 60}
      uniqueId={pcd.id}
      fgColor={getQRCodeColorOverride(pcd)}
    />
  );
}

export function ZKTicketPCDCard({ pcd }: { pcd: EdDSATicketPCD }) {
  const ticketData = pcd.claim.ticket;

  return (
    <Container>
      <TicketInfo>
        <TicketQR pcd={pcd} />
        <span>{ticketData?.attendeeName}</span>
        <span>{ticketData?.attendeeEmail}</span>
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
