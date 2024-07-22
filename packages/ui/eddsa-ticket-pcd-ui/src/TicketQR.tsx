import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  getQRCodeColorOverride,
  linkToTicket
} from "@pcd/eddsa-ticket-pcd";
import {
  QRDisplayWithRegenerateAndStorage,
  encodeQRPayload,
  styled
} from "@pcd/passport-ui";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  ZKEdDSAEventTicketPCD,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import { useCallback } from "react";
import { VscLoading } from "react-icons/vsc";
import urlJoin from "url-join";
import { EdDSATicketPCDCardProps } from "./CardBody";

function makeVerifyLink(baseUrl: string, qrPayload: string): string {
  return urlJoin(baseUrl, `?pcd=${encodeURIComponent(qrPayload)}`);
}

export function TicketQR({
  pcd,
  zk,
  identityPCD,
  verifyURL,
  idBasedVerifyURL
}: {
  pcd: EdDSATicketPCD;
  zk: boolean;
} & EdDSATicketPCDCardProps): JSX.Element {
  const generate = useCallback(async () => {
    if (
      [
        "53edb3e7-6733-41e0-a9be-488877c5c572", // eth berlin
        "508313ea-f16b-4729-bdf0-281c64493ca9" //  eth prague
      ].includes(pcd.claim.ticket.eventId) &&
      pcd.claim.ticket.ticketSecret
    ) {
      return pcd.claim.ticket.ticketSecret;
    } else if (idBasedVerifyURL && !zk) {
      return linkToTicket(
        idBasedVerifyURL,
        pcd.claim.ticket.ticketId,
        pcd.claim.ticket.eventId
      );
    } else {
      // If we're not doing ID-based verification, then we need a ZK proof
      const serializedZKPCD = await makeSerializedZKProof(pcd, identityPCD);
      return makeVerifyLink(
        verifyURL,
        encodeQRPayload(JSON.stringify(serializedZKPCD))
      );
    }
  }, [idBasedVerifyURL, zk, pcd, identityPCD, verifyURL]);
  if (zk) {
    return (
      <QRDisplayWithRegenerateAndStorage
        // Key is necessary so that React notices that this isn't the non-ZK
        // QR code component.
        key={`zk-${pcd.id}`}
        generateQRPayload={generate}
        loadingLogo={
          <LoadingIconContainer>
            <LoadingSpinner />
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
        uniqueId={undefined}
        fgColor={getQRCodeColorOverride(pcd)}
      />
    );
  }
}

function LoadingSpinner(): JSX.Element {
  return (
    <Spin>
      <VscLoading size={100} />
    </Spin>
  );
}

async function makeSerializedZKProof(
  pcd: EdDSATicketPCD,
  identityPCD: SemaphoreIdentityPCD
): Promise<SerializedPCD<ZKEdDSAEventTicketPCD>> {
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

  return await ZKEdDSAEventTicketPCDPackage.serialize(zkPCD);
}

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

const Spin = styled.div`
  animation: spin infinite 1s linear;

  svg {
    width: 100px;
    height: 100px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
