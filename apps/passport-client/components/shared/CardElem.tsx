import * as React from "react";
import styled from "styled-components";
import { Card, ZuIdCard } from "../../src/model/Card";
import { H4, TextCenter } from "../core";
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
  if (expanded) {
    return (
      <CardContainerExpanded>
        <CardOutlineExpanded>
          <CardHeader col="var(--accent-lite)">{header}</CardHeader>
          <CardBody card={card} />
        </CardOutlineExpanded>
      </CardContainerExpanded>
    );
  }

  return (
    <CardContainerCollapsed {...{ onClick }}>
      <CardOutlineCollapsed>
        <CardHeaderCollapsed>{header}</CardHeaderCollapsed>
      </CardOutlineCollapsed>
    </CardContainerCollapsed>
  );
}

const CardContainerExpanded = styled.div`
  width: 100%;
  padding: 0 8px;
`;

const CardContainerCollapsed = styled(CardContainerExpanded)`
  cursor: pointer;
  padding: 12px 8px;
`;

const CardOutlineExpanded = styled.div`
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--accent-dark);
  background: var(--primary-dark);
  min-height: 160px;
`;

const CardOutlineCollapsed = styled.div`
  width: 100%;
  border-radius: 12px 12px 0 0;
  border: 1px solid var(--primary-lite);
  color: var(--primary-lite);
  border-bottom: none;

  :hover {
    opacity: 0.9;
  }
`;

const CardHeaderCollapsed = styled.div`
  text-align: center;
  font-size: 16px;
  padding: 8px;
`;

const CardHeader = styled(H4)`
  text-align: center;
  padding: 10px;
`;

function CardBody({ card }: { card: Card }) {
  const { type } = card;

  switch (type) {
    case "zuzalu-id":
      return <ZuzaluCardBody card={card as ZuIdCard} />;
    default:
      return <TextCenter>{type}</TextCenter>;
  }
}
