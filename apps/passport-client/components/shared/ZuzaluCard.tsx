import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import * as React from "react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import styled from "styled-components";
import { createZuzaluQRProof } from "../../src/createZuzaluQRProof";
import { ZuIdCard } from "../../src/model/Card";
import { encodeQRPayload, makeEncodedVerifyLink } from "../../src/qr";
import { H3, InfoLine, Spacer, TextCenter } from "../core";

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
    p.role === "resident" ? "var(--accent-lite)" : "var(--primary-dark)"};
  color: ${(p) =>
    p.role === "resident" ? "var(--primary-dark)" : "var(--white)"};
  /* Must be slightly lower than the card's border-radius to nest correctly. */
  border-radius: 0 0 10px 10px;
  padding: 8px;
  text-align: center;
`;

function ZuzaluQR({ card }: { card: ZuIdCard }) {
  const [qrPayload, setQRPayload] = useState<string | undefined>();

  useEffect(() => {
    const { identity, participant } = card;
    if (identity == null) return;

    createZuzaluQRProof(identity, participant.uuid)
      .then(SemaphoreGroupPCDPackage.serialize)
      .then((serialized) => {
        const stringified = JSON.stringify(serialized);
        console.log(
          `generated zuzalu QR proof with length ${stringified.length}`
        );
        const encodedProof = encodeQRPayload(stringified);
        setQRPayload(encodedProof);
      });
  }, [card]);

  if (qrPayload == null)
    return (
      <QRWrap>
        <QRLogoLoading />
      </QRWrap>
    );

  const qrLink = makeEncodedVerifyLink(qrPayload);
  console.log(`Link, ${qrLink.length} bytes: ${qrLink}`);

  return (
    <QRWrap>
      <QRCode bgColor={qrBg} fgColor={qrFg} value={qrLink} style={qrStyle} />
      {/* config.devMode && <a href={link}>dev link</a> */}
    </QRWrap>
  );
}

function QRLogoLoading() {
  return <QRLogo width="48" height="48" src="/assets/qr-center-loading.svg" />;
}

function QRLogoDone() {
  return <QRLogo width="48" height="48" src="/assets/qr-center-logo.svg" />;
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
  var style = getComputedStyle(document.body);
  const bg = style.getPropertyValue("--white");
  const fg = style.getPropertyValue("--primary-dark");
  return [bg, fg];
})();

const QRWrap = styled.div`
  position: relative;
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
