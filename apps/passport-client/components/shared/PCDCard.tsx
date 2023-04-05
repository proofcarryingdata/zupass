import { PCD } from "@pcd/pcd-types";
import * as React from "react";
import { useMemo } from "react";
import styled from "styled-components";
import { usePackage } from "../../src/usePackage";
import { H4, TextCenter } from "../core";
import { ZuzaluCardBody } from "./ZuzaluCard";

/**
 * Shows a card in the Passport wallet. If expanded, the full card, otherwise
 * just the top of the card to allow stacking.
 */
export function PCDCard({
  isZuzaluIdentity,
  pcd,
  expanded,
  onClick,
}: {
  pcd: PCD;
  expanded?: boolean;
  isZuzaluIdentity?: boolean;
  onClick?: () => void;
}) {
  const pcdPackage = usePackage(pcd);
  const displayOptions = useMemo(() => {
    if (pcdPackage?.getDisplayOptions) {
      return pcdPackage?.getDisplayOptions(pcd);
    }
  }, [pcd, pcdPackage]);
  const header = isZuzaluIdentity
    ? "VERIFIED ZUZALU PASSPORT"
    : displayOptions?.header ?? "PCD";

  if (expanded) {
    return (
      <CardContainerExpanded>
        <CardOutlineExpanded>
          <CardHeader col="var(--accent-lite)">{header}</CardHeader>
          <CardBody pcd={pcd} isZuzaluIdentity={isZuzaluIdentity} />
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

function CardBody({
  pcd,
  isZuzaluIdentity,
}: {
  pcd: PCD;
  isZuzaluIdentity: boolean;
}) {
  if (isZuzaluIdentity) {
    return <ZuzaluCardBody />;
  }

  return <TextCenter>{pcd.type}</TextCenter>;
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
  user-select: none;
  text-align: center;
  font-size: 16px;
  padding: 8px;
`;

const CardHeader = styled(H4)`
  text-align: center;
  padding: 10px;
`;
