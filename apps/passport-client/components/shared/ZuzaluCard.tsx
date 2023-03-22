import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { Buffer } from "buffer";
import { gzip } from "pako";
import * as React from "react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import styled from "styled-components";
import { ZuIdCard } from "../../src/model/Card";
import { createProof } from "../../src/proveSemaphore";
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
  // Create proof PCD
  const [serialized, setSerialized] = useState<string>();
  useEffect(() => {
    const { identity, participant } = card;
    if (identity == null) return;
    const { serialize } = SemaphoreGroupPCDPackage;
    createProof(identity, participant.uuid)
      .then(serialize)
      .then((serialized) => setSerialized(JSON.stringify(serialized)));
  }, [card]);
  if (serialized == null) return <QRWrap />;

  console.log(`PCD size: ${serialized.length} bytes`);
  const compressed = gzip(serialized);
  const enc = encodeURIComponent(Buffer.from(compressed).toString("base64"));
  console.log(`Compressed: ${compressed.length}, base64: ${enc.length}`);

  const link = `${window.location.origin}#/verify?pcd=${enc}`;
  console.log(`Link, ${link.length} bytes: ${link}`);

  return (
    <QRWrap>
      <QRCode bgColor={qrBg} fgColor={qrFg} value={link} style={qrStyle} />
      {/* config.devMode && <a href={link}>dev link</a> */}
    </QRWrap>
  );
}

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
  width: ${qrSize};
  height: ${qrSize};
  margin: 0 auto;
`;
