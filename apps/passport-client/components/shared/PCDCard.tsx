import { PCD } from "@pcd/pcd-types";
import { useCallback, useContext, useMemo } from "react";
import styled from "styled-components";
import { appConfig } from "../../src/appConfig";
import { DispatchContext } from "../../src/dispatch";
import { usePackage } from "../../src/usePackage";
import { getVisitorStatus, VisitorStatus } from "../../src/user";
import { Button, H4, Spacer, TextCenter } from "../core";
import { ZuzaluCardBody } from "./ZuzaluCard";

/**
 * Shows a card in the Passport wallet. If expanded, the full card, otherwise
 * just the top of the card to allow stacking.
 */
export function PCDCard({
  isMainIdentity,
  pcd,
  expanded,
  onClick,
  hideRemoveButton,
}: {
  pcd: PCD;
  expanded?: boolean;
  isMainIdentity?: boolean;
  onClick?: () => void;
  hideRemoveButton?: boolean;
}) {
  const [state] = useContext(DispatchContext);
  const pcdPackage = usePackage(pcd);

  const displayOptions = useMemo(() => {
    if (pcdPackage?.getDisplayOptions) {
      return pcdPackage?.getDisplayOptions(pcd);
    }
  }, [pcd, pcdPackage]);

  let header;
  let notCurrentVisitor = false;

  if (isMainIdentity && !appConfig.isZuzalu) {
    header = "PCDPASS IDENTITY";
  } else if (isMainIdentity) {
    const visitorStatus = getVisitorStatus(state.self);

    if (
      visitorStatus.isVisitor &&
      visitorStatus.status === VisitorStatus.Expired
    ) {
      header = "EXPIRED";
    } else if (
      visitorStatus.isVisitor &&
      visitorStatus.status === VisitorStatus.Upcoming
    ) {
      header = "UPCOMING";
    } else {
      header = "VERIFIED ZUZALU PASSPORT";
    }

    notCurrentVisitor =
      visitorStatus.isVisitor && visitorStatus.status !== VisitorStatus.Current;
  } else if (displayOptions?.header) {
    header = displayOptions.header.toUpperCase();
  }

  const headerContent = header ? (
    <>{header}</>
  ) : (
    pcdPackage?.renderCardBody({ pcd, returnHeader: true })
  );

  if (expanded) {
    return (
      <CardContainerExpanded>
        <CardOutlineExpanded>
          <CardHeader
            col={notCurrentVisitor ? "" : "var(--accent-lite)"}
            style={{
              backgroundColor: notCurrentVisitor ? "var(--danger)" : "",
            }}
          >
            {headerContent}
          </CardHeader>
          <CardBodyContainer>
            <CardBody pcd={pcd} isMainIdentity={isMainIdentity} />
            {!hideRemoveButton && (
              <CardFooter pcd={pcd} isMainIdentity={isMainIdentity} />
            )}
          </CardBodyContainer>
        </CardOutlineExpanded>
      </CardContainerExpanded>
    );
  }

  return (
    <CardContainerCollapsed {...{ onClick }}>
      <CardOutlineCollapsed>
        <CardHeaderCollapsed>{headerContent}</CardHeaderCollapsed>
      </CardOutlineCollapsed>
    </CardContainerCollapsed>
  );
}

function CardFooter({
  pcd,
  isMainIdentity: isZuzaluIdentity,
}: {
  pcd: PCD;
  isMainIdentity: boolean;
}) {
  const [_, dispatch] = useContext(DispatchContext);

  const onRemoveClick = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to remove this PCD? It will be permanently deleted!"
      )
    ) {
      dispatch({ type: "remove-pcd", id: pcd.id });
    }
  }, [pcd, dispatch]);

  if (isZuzaluIdentity) {
    return null;
  }

  return (
    <FooterContainer>
      <Button style="danger" size="small" onClick={onRemoveClick}>
        Remove
      </Button>
    </FooterContainer>
  );
}

function CardBody({
  pcd,
  isMainIdentity: isZuzaluIdentity,
}: {
  pcd: PCD;
  isMainIdentity: boolean;
}) {
  const [state] = useContext(DispatchContext);

  if (isZuzaluIdentity) {
    return <ZuzaluCardBody showQrCode={true} />;
  }

  if (state.pcds.hasPackage(pcd.type)) {
    const pcdPackage = state.pcds.getPackage(pcd.type);
    if (pcdPackage.renderCardBody) {
      const Component = pcdPackage.renderCardBody;
      return <Component pcd={pcd} />;
    }
  }

  return (
    <>
      <TextCenter>
        {pcd.type} unsupported <br />
        no implementation of a ui for this type of card found
      </TextCenter>
      <Spacer h={16} />
    </>
  );
}

export const CardContainerExpanded = styled.div`
  width: 100%;
  padding: 0 8px;
`;

const CardContainerCollapsed = styled(CardContainerExpanded)`
  cursor: pointer;
  padding: 12px 8px;
`;

export const CardOutlineExpanded = styled.div`
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--accent-dark);
  background: var(--primary-dark);
  overflow: hidden;
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

export const CardHeader = styled(H4)`
  text-align: center;
  padding: 10px;
`;

const FooterContainer = styled.div`
  padding: 0px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

const CardBodyContainer = styled.div`
  background-color: white;
  color: var(--bg-dark-primary);
`;
