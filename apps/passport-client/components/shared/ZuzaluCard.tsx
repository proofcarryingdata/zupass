import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { Buffer } from "buffer";
import { gzip } from "pako";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import styled from "styled-components";
import { CardZID } from "../../src/model/Card";
import { createProof } from "../../src/proveSemaphore";
import { H3, Spacer, TextCenter } from "../core";

export function ZuzaluCardBody({ card }: { card: CardZID }) {
  const { role, name } = card.participant;
  return (
    <>
      <Spacer h={24} />
      <Placeholder>
        <ZuzaluQR card={card} />
      </Placeholder>
      <Spacer h={16} />
      <H3>
        <TextCenter>{name}</TextCenter>
      </H3>
      <Spacer h={32} />
      <Footer role={role}>ZUZALU {role.toUpperCase()}</Footer>
    </>
  );
}

const Placeholder = styled.div`
  width: 280px;
  height: 280px;
  margin: 0 auto;
`;

const Footer = styled.div<{ role: string }>`
  font-size: 20px;
  background: ${(p) => (p.role === "resident" ? "#FFE5A4" : "#325F57")};
  color: ${(p) => (p.role === "resident" ? "#325F57" : "#fff")};
  border-radius: 0 0 12px 12px;
  padding: 8px;
  text-align: center;
`;

function ZuzaluQR({ card }: { card: CardZID }) {
  const style = useMemo(() => ({ width: "280px", height: "280px" }), []);
  const { identity } = card;
  if (!identity) return null;

  const [serialized, setSerialized] = useState<string>();
  useEffect(() => {
    const { serialize } = SemaphoreGroupPCDPackage;
    createProof(identity)
      .then(serialize)
      .then((serialized) => setSerialized(JSON.stringify(serialized)));
  }, [identity]);
  if (serialized == null) return null;

  console.log(`PCD size: ${serialized.length} bytes`);
  const compressed = gzip(serialized);
  const enc = encodeURIComponent(Buffer.from(compressed).toString("base64"));
  console.log(`Compressed: ${compressed.length}, base64: ${enc.length}`);

  const link = `${window.location.origin}#/verify?pcd=${enc}`;
  console.log(`Link, ${link.length} bytes: ${link}`);

  return (
    <QRCode bgColor="#325F57" fgColor="#ffffff" value={link} style={style} />
  );
}
