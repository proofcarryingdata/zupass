import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import styled from "styled-components";
import { config } from "../../src/config";
import { createZuzaluQRProof } from "../../src/createZuzaluQRProof";
import { ZuIdCard } from "../../src/model/Card";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { H3, InfoLine, Spacer, TextCenter } from "../core";
import { icons } from "../icons";

export function ZuzaluCardBody({ card }: { card: ZuIdCard }) {
  const { role, name, email, residence } = card.participant;
  return (
    <CardBody>
      {card.identity && (
        <>
          <Spacer h={32} />
          <ZuzaluQR card={card} />
        </>
      )}
      <Spacer h={24} />
      <TextCenter>
        <H3 col="var(--primary-dark)">{name}</H3>
        <InfoLine>{email}</InfoLine>
        <InfoLine>{residence}</InfoLine>
      </TextCenter>
      <Spacer h={24} />
      <Footer role={role}>ZUZALU {role.toUpperCase()}</Footer>
    </CardBody>
  );
}

const CardBody = styled.div`
  background: var(--white);
  color: var(--primary-dark);
  border-radius: 0 0 12px 12px;
`;

const Footer = styled.div<{ role: string }>`
  font-size: 20px;
  letter-spacing: 1px;
  background: ${(p) =>
    highlight(p.role) ? "var(--accent-lite)" : "var(--primary-dark)"};
  color: ${(p) => (highlight(p.role) ? "var(--primary-dark)" : "var(--white)")};
  /* Must be slightly lower than the card's border-radius to nest correctly. */
  border-radius: 0 0 10px 10px;
  padding: 8px;
  text-align: center;
`;

function highlight(role: string) {
  return role === "resident" || role === "organizer";
}

function ZuzaluQR({ card }: { card: ZuIdCard }) {
  const { identity, participant } = card;
  const { uuid } = participant;

  const [qrPayload, setQRPayload] = useState<string | undefined>();

  const generateQr = useCallback(
    async function () {
      const pcd = await createZuzaluQRProof(identity, uuid);
      const serialized = await SemaphoreSignaturePCDPackage.serialize(pcd);
      const stringified = JSON.stringify(serialized);
      console.log(
        `generated zuzalu QR proof with length ${stringified.length}`
      );
      const encodedProof = encodeQRPayload(stringified);
      setQRPayload(encodedProof);
    },
    [identity, uuid]
  );

  // Generate QR code on mount, then regenerate periodically
  useEffect(() => {
    generateQr();
    const interval = setInterval(generateQr, (config.maxProofAge * 2) / 3);
    return () => clearInterval(interval);
  }, [generateQr]);

  if (qrPayload == null) {
    return (
      <QRWrap>
        <QRLogoLoading />
      </QRWrap>
    );
  }

  const qrLink = makeEncodedVerifyLink(qrPayload);
  console.log(`Link, ${qrLink.length} bytes: ${qrLink}`);

  return (
    <QRWrap>
      <QRCode bgColor={qrBg} fgColor={qrFg} value={qrLink} style={qrStyle} />
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
const qrSize = "280px";
const qrStyle = { width: qrSize, height: qrSize };
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
