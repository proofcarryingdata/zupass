import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  TicketCategory,
  getQRCodeColorOverride
} from "@pcd/eddsa-ticket-pcd";
import { ZUCONNECT_23_DAY_PASS_PRODUCT_ID } from "@pcd/passport-interface";
import {
  QRDisplayWithRegenerateAndStorage,
  Spacer,
  encodeQRPayload,
  icons
} from "@pcd/passport-ui";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback, useState } from "react";
import styled from "styled-components";
import { useUserIdentityPCD } from "../../../src/appHooks";
import { makeEncodedVerifyLink } from "../../../src/qr";
import { TextCenter } from "../../core";
import { RedactedText } from "../../core/RedactedText";
import { ToggleSwitch } from "../../core/Toggle";

function makeTicketIdVerifyLink(ticketId: string): string {
  const link = `${window.location.origin}/#/verify?id=${encodeURIComponent(
    Buffer.from(
      JSON.stringify({ ticketId, timestamp: Date.now().toString() })
    ).toString("base64")
  )}`;
  return link;
}

/**
 * Generates a ZK proof and uses this to generate the QR code.
 * This overrides the normal rendering of an EdDSATicketPCD, and is
 * done here to avoid circular dependencies between EdDSATicketPCD and
 * ZKEdDSAEventTicketPCD.
 */
function TicketQR({ pcd, zk }: { pcd: EdDSATicketPCD; zk: boolean }) {
  const identityPCD = useUserIdentityPCD();

  const generate = useCallback(async () => {
    if (zk) {
      const serializedTicketPCD = await EdDSATicketPCDPackage.serialize(pcd);
      const serializedIdentityPCD =
        await SemaphoreIdentityPCDPackage.serialize(identityPCD);
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
      const serializedZKPCD =
        await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);
      const verificationLink = makeEncodedVerifyLink(
        encodeQRPayload(JSON.stringify(serializedZKPCD))
      );
      return verificationLink;
    } else {
      const ticketId = pcd.claim.ticket.ticketId;
      const verificationLink = makeTicketIdVerifyLink(ticketId);
      return verificationLink;
    }
  }, [pcd, identityPCD, zk]);

  if (zk) {
    return (
      <QRDisplayWithRegenerateAndStorage
        key={`zk-${pcd.id}`}
        loadingLogo={
          <LoadingIconContainer>
            <LoadingIcon src={icons.qrCenterLoading} />
          </LoadingIconContainer>
        }
        generateQRPayload={generate}
        maxAgeMs={1000 * 60}
        uniqueId={`zk-${pcd.id}`}
        fgColor={getQRCodeColorOverride(pcd)}
      />
    );
  } else {
    return (
      <QRDisplayWithRegenerateAndStorage
        key={pcd.id}
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
}

function ZuconnectDayPassInfo({ ticketName }: { ticketName: string }) {
  const lines = ticketName.split("\n");
  return (
    <>
      <TextCenter>
        {lines.map((line) => (
          <div>{line.toLocaleUpperCase()}</div>
        ))}
      </TextCenter>
    </>
  );
}

export function ZKTicketPCDCard({ pcd }: { pcd: EdDSATicketPCD }) {
  const [zk, setZk] = useState<boolean>(false);
  const onToggle = useCallback(() => {
    setZk(!zk);
  }, [zk]);
  const ticketData = pcd.claim.ticket;

  return (
    <Container>
      <TicketInfo>
        <TicketQR zk={zk} pcd={pcd} />
        {ticketData.ticketCategory === TicketCategory.ZuConnect &&
          ticketData.productId === ZUCONNECT_23_DAY_PASS_PRODUCT_ID && (
            <>
              <Spacer h={8} />
              <ZuconnectDayPassInfo ticketName={ticketData.ticketName} />
            </>
          )}
        <Spacer h={8} />
        <RedactedText redacted={zk}>{ticketData?.attendeeName}</RedactedText>
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

const ZKMode = styled.div`
  display: flex;
  text-align: right;
  margin-top: 8px;
  padding: 0px 16px;
  width: 100%;
  justify-content: flex-end;
`;
