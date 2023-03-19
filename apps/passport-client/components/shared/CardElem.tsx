import * as React from "react";
import styled from "styled-components";
import { Card, CardZID } from "../../src/model/Card";
import { TextCenter } from "../core";
import { ZuzaluCardBody } from "./ZuzaluCard";

/**
 * Shows a card in the Passport wallet. If expanded, the full card, otherwise
 * just the top of the card to allow stacking.
 */
export function CardElem({
  card,
  expanded,
  onClick,
}: {
  card: Card;
  expanded?: boolean;
  onClick?: () => void;
}) {
  // Show either a full card slot or the entire (expanded) card
  const { header } = card;
  return (
    <CardContainer clickable={onClick != null} {...{ onClick, expanded }}>
      {!expanded && <CardHeaderCollapsed>{header}</CardHeaderCollapsed>}
      {expanded && (
        <>
          <CardHeader>{header}</CardHeader>
          <CardBody card={card} />
        </>
      )}
    </CardContainer>
  );
}

const CardContainer = styled.div<{ clickable: boolean; expanded: boolean }>`
  width: calc(100% - 16px);
  margin: 0 8px;
  cursor: ${(p) => (p.clickable ? "pointer" : "default")};
  border-radius: ${(p) => (p.expanded ? "12px" : "12px 12px 0 0")};
  border: 1px solid ${(p) => (p.expanded ? "#FFE5A4" : "#325F57")};
  ${(p) => (p.expanded ? "min-height: 280px;" : "")}
  ${(p) => (p.expanded ? "background: #325F57;" : "")}
  ${(p) => (!p.expanded ? "border-bottom: none; margin-bottom: 8px;" : "")}
`;

const CardHeaderCollapsed = styled.div`
  text-align: center;
  color: #325f57;
  font-size: 16px;
  padding: 8px;
`;

const CardHeader = styled.div`
  font-size: 20px;
  text-align: center;
  color: #ffe5a4;
  padding: 12px;
`;

function CardBody({ card }: { card: Card }) {
  const { type } = card;

  switch (type) {
    case "zuzalu-id":
      return <ZuzaluCardBody card={card as CardZID} />;
    default:
      return <TextCenter>{type}</TextCenter>;
  }
}
