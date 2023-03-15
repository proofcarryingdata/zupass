import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import styled from "styled-components";
import { Card, CardZID } from "../../src/model/Card";
import { createProof } from "../../src/proveSemaphore";
import { H1, TextEllipsis } from "../core";

/**
 * Shows a card in the Passport wallet. If expanded, the full card, otherwise
 * just the top of the card to allow stacking.
 */
export function CardElem({
  card,
  expanded,
  onClick,
}: {
  card?: Card;
  expanded?: boolean;
  onClick?: () => void;
}) {
  if (!card) {
    // Show an empty card slot
    return (
      <CardContainer clickable={false}>
        <CardSlot></CardSlot>
      </CardContainer>
    );
  }

  // Show either a full card slot or the entire (expanded) card
  const { display } = card;
  return (
    <CardContainer clickable={onClick != null} onClick={onClick}>
      {!expanded && (
        <CardSlot>
          <CardTop color={display.color}>
            <CardHeader card={card} />
          </CardTop>
        </CardSlot>
      )}
      {expanded && (
        <CardFull color={display.color}>
          <CardHeader card={card} />
          <CardBody card={card} />
        </CardFull>
      )}
    </CardContainer>
  );
}

function CardBody({ card }: { card: Card }) {
  const { type, display } = card;
  return (
    <>
      <CardLine>
        <div>
          <H1>{display.icon}</H1>
        </div>
        <div>
          <H1>{display.title}</H1>
          <p>{display.description}</p>
        </div>
      </CardLine>
      {type === "zuzalu-id" && <ZuzaluIdBody card={card as CardZID} />}
    </>
  );
}
function CardHeader({ card }: { card: Card }) {
  const { display } = card;
  return (
    <CardLine>
      <CardHeaderIcon>{display.icon}</CardHeaderIcon>
      <TextEllipsis>{display.header}</TextEllipsis>
    </CardLine>
  );
}

const CardHeaderIcon = styled.span`
  margin-left: 6px;
`;

const CardContainer = styled.div<{ clickable: boolean }>`
  width: 100%;
  cursor: ${(p) => (p.clickable ? "pointer" : "default")};
`;

const CardSlot = styled.div`
  border-bottom: 2px solid #888;
  height: 48px;
  margin: 16px 0;
  display: flex;
  align-items: flex-end;
`;

const CardBase = styled.div<{ color: string }>`
  background-color: ${(p) => p.color};
  border-radius: 8px;
  margin: 0 16px;
  padding: 16px;
  transition: all 0.1s;
`;

const CardTop = styled(CardBase)`
  flex-grow: 1;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
  padding-bottom: 4px;
  &:hover {
    padding-bottom: 6px;
  }
`;

const CardLine = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr;
`;

const CardFull = styled(CardBase)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  height: 320px;
  &:hover {
    top: -1px;
  }
`;

function ZuzaluIdBody({ card }: { card: CardZID }) {
  const style = useMemo(() => ({ width: "160px", height: "160px" }), []);
  const { identity } = card;

  const [serialized, setSerialized] = useState<string>();
  useEffect(() => {
    const { serialize } = SemaphoreGroupPCDPackage;
    createProof(identity).then(serialize).then(setSerialized);
  }, [identity]);
  if (serialized == null) return null;

  console.log(`Displaying QR code, ${serialized.length} bytes`);
  console.log(serialized);

  return (
    <ZIDWrap>
      <QRCode bgColor={card.display.color} value={serialized} style={style} />
    </ZIDWrap>
  );
}

const ZIDWrap = styled.div`
  padding: 0 48px;
`;
