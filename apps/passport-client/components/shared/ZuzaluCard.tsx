import {
  DateRange,
  ParticipantRole,
  ZuParticipant,
} from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { createZuzaluQRProof } from "../../src/createZuzaluQRProof";
import { DispatchContext } from "../../src/dispatch";
import { getVisitorStatus, VisitorStatus } from "../../src/participant";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { H3, InfoLine, Spacer, TextCenter } from "../core";
import { icons } from "../icons";
import { QR } from "./QR";

export function ZuzaluCardBody({
  showQrCode,
  participant,
}: {
  showQrCode?: boolean;
  participant?: ZuParticipant;
}) {
  const [state, _] = useContext(DispatchContext);
  const actualParticipant = participant ?? state.self;
  const { role, name, email } = actualParticipant;
  const visitorStatus = getVisitorStatus(actualParticipant);

  return (
    <CardBody>
      {showQrCode &&
        !(
          visitorStatus.isVisitor &&
          visitorStatus.status !== VisitorStatus.Current
        ) && (
          <>
            <Spacer h={32} />
            <ZuzaluQR />
          </>
        )}
      <Spacer h={24} />
      <TextCenter>
        <H3 col="var(--primary-dark)">{name}</H3>
        <InfoLine>{email}</InfoLine>
        <VisitorDateSection participant={actualParticipant} />
      </TextCenter>
      <Spacer h={24} />
      <Footer
        role={role}
        notCurrent={
          visitorStatus.isVisitor &&
          visitorStatus.status !== VisitorStatus.Current
        }
      >
        ZUZALU {role.toUpperCase()}
      </Footer>
    </CardBody>
  );
}

function VisitorDateSection({ participant }: { participant?: ZuParticipant }) {
  if (!participant) return null;
  if (participant.role !== ParticipantRole.Visitor) return null;
  if (!participant.visitor_date_ranges) return null;

  return (
    <>
      <InfoLine>
        <b>Visitor Dates:</b>
      </InfoLine>
      {participant.visitor_date_ranges.map((range, i) => (
        <InfoLine key={i}>
          <DateRangeText range={range} />
        </InfoLine>
      ))}
    </>
  );
}

function DateRangeText({ range }: { range: DateRange }) {
  return (
    <span>
      {new Date(range.date_from).toDateString()} -{" "}
      {new Date(range.date_to).toDateString()}
    </span>
  );
}

const CardBody = styled.div`
  background: var(--white);
  color: var(--primary-dark);
  border-radius: 0 0 12px 12px;
`;

const Footer = styled.div<{ role: string; notCurrent: boolean }>`
  font-size: 20px;
  letter-spacing: 1px;
  background: ${(p) => {
    if (p.notCurrent) {
      return "var(--danger)";
    }

    return highlight(p.role) ? "var(--accent-lite)" : "var(--primary-dark)";
  }};
  color: ${(p) => (highlight(p.role) ? "var(--primary-dark)" : "var(--white)")};
  /* Must be slightly lower than the card's border-radius to nest correctly. */
  border-radius: 0 0 10px 10px;
  padding: 8px;
  text-align: center;
`;

function highlight(role: string) {
  return role === "resident" || role === "organizer";
}

/**
 * Generate a fresh Zuzalu identity-revealing proof every n ms.
 * We regenerate before the proof expires to allow for a few minutes of
 * clock skew between prover and verifier.
 */
const regenerateAfterMs = (appConfig.maxProofAge * 2) / 3;

interface QRPayload {
  timestamp: number;
  qrPCD: string;
}

function ZuzaluQR() {
  const [state] = useContext(DispatchContext);
  const { identity, self } = state;
  const { uuid } = self;

  const [qrPayload, setQRPayload] = useState<QRPayload>(() => {
    const { timestamp, qrPCD } = JSON.parse(localStorage["zuzaluQR"] || "{}");
    if (timestamp != null && Date.now() - timestamp < appConfig.maxProofAge) {
      console.log(`[QR] from localStorage, timestamp ${timestamp}`);
      return { timestamp, qrPCD };
    }
  });

  const maybeGenerateQR = useCallback(
    async function () {
      const timestamp = Date.now();
      if (qrPayload && timestamp - qrPayload.timestamp < regenerateAfterMs) {
        console.log(`[QR] not regenerating, timestamp ${timestamp}`);
        return;
      }

      console.log(`[QR] generating zuzalu proof, timestamp ${timestamp}`);
      const pcd = await createZuzaluQRProof(identity, uuid, timestamp);
      const serialized = await SemaphoreSignaturePCDPackage.serialize(pcd);
      const stringified = JSON.stringify(serialized);
      console.log(`[QR] generated zuzalu proof, length ${stringified.length}`);

      const qrPCD = encodeQRPayload(stringified);
      localStorage["zuzaluQR"] = JSON.stringify({ timestamp, qrPCD });
      setQRPayload({ timestamp, qrPCD });
    },
    [identity, qrPayload, uuid]
  );

  // Load or generate QR code on mount, then regenerate periodically
  useEffect(() => {
    maybeGenerateQR();
    const interval = setInterval(maybeGenerateQR, appConfig.maxProofAge / 10);
    return () => clearInterval(interval);
  }, [maybeGenerateQR]);

  if (qrPayload == null) {
    return (
      <QRWrap>
        <QRLogoLoading />
      </QRWrap>
    );
  }

  const qrLink = makeEncodedVerifyLink(qrPayload.qrPCD);
  console.log(`Link, ${qrLink.length} bytes: ${qrLink}`);

  return (
    <QRWrap>
      <QR value={qrLink} bgColor={qrBg} fgColor={qrFg} />
      <QRLogoDone />
    </QRWrap>
  );
}

function QRLogoLoading() {
  return <QRLogo width="48" height="48" src={icons.qrCenterLoading} />;
}

function QRLogoDone() {
  return <QRLogo width="48" height="48" src={icons.qrCenter} />;
}

const QRLogo = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

// Style constants
const qrSize = "300px";
const [qrBg, qrFg] = (() => {
  const style = getComputedStyle(document.body);
  const bg = style.getPropertyValue("--white");
  const fg = style.getPropertyValue("--bg-dark-primary");
  return [bg, fg];
})();

const QRWrap = styled.div`
  position: relative;
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
