import {
  EdDSATicketPCD,
  TicketCategory,
  isEdDSATicketPCD
} from "@pcd/eddsa-ticket-pcd";
import {
  EdDSATicketPCDUI,
  TicketQR as EddsaTicketQR
} from "@pcd/eddsa-ticket-pcd-ui";
import { PCD, PCDUI } from "@pcd/pcd-types";
import { isPODTicketPCD } from "@pcd/pod-ticket-pcd";
import {
  PODTicketPCDUI,
  TicketQR as PODTicketQR
} from "@pcd/pod-ticket-pcd-ui";
import {
  forwardRef,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";
import { usePCDCollection, useUserIdentityPCD } from "../../src/appHooks";
import { StateContext } from "../../src/dispatch";
import { pcdRenderers } from "../../src/pcdRenderers";
import { usePackage } from "../../src/usePackage";
import { Button, H4, Spacer, TextCenter } from "../core";
import { MainIdentityCard } from "./MainIdentityCard";
import { isPODPCD } from "@pcd/pod-pcd";
import { PODPCDUI } from "@pcd/pod-pcd-ui";

export const PCDCard = memo(PCDCardImpl);

/**
 * Shows a card representing a PCD in Zupass. If expanded, the full card, otherwise
 * just the top of the card to allow stacking.
 */
function PCDCardImpl({
  isMainIdentity,
  pcd,
  expanded,
  onClick,
  hideRemoveButton,
  hidePadding
}: {
  pcd: PCD;
  expanded?: boolean;
  isMainIdentity?: boolean;
  onClick?: (id: string, cardContainer: HTMLDivElement | undefined) => void;
  hideRemoveButton?: boolean;
  hidePadding?: boolean;
}): JSX.Element {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | undefined>(
    undefined
  );

  const clickHandler = useCallback(() => {
    onClick?.(pcd.id, containerRef);
  }, [containerRef, onClick, pcd.id]);

  isMainIdentity = isMainIdentity ?? false;

  return (
    <CardContainer
      ref={(e) => setContainerRef(e ?? undefined)}
      key={pcd.id}
      onClick={clickHandler}
      style={!expanded ? { padding: "8px 12px", cursor: "pointer" } : {}}
    >
      {expanded ? (
        <CardOutlineExpanded>
          <CardBodyContainer>
            <CardBody
              pcd={pcd}
              isMainIdentity={isMainIdentity}
              hidePadding={hidePadding}
            />
            {!hideRemoveButton && (
              <CardFooter pcd={pcd} isMainIdentity={isMainIdentity} />
            )}
            {hideRemoveButton && !hidePadding && <Spacer h={8} />}
          </CardBodyContainer>
        </CardOutlineExpanded>
      ) : (
        <CardOutlineCollapsed>
          <CardHeaderCollapsed>
            <HeaderContent pcd={pcd} isMainIdentity={isMainIdentity} />
          </CardHeaderCollapsed>
        </CardOutlineCollapsed>
      )}
    </CardContainer>
  );
}

function HeaderContent({
  pcd,
  isMainIdentity
}: {
  pcd: PCD;
  isMainIdentity: boolean;
}): JSX.Element | null {
  const pcdPackage = usePackage(pcd);

  const displayOptions = useMemo(() => {
    if (pcdPackage?.getDisplayOptions) {
      return pcdPackage?.getDisplayOptions(pcd);
    }
  }, [pcd, pcdPackage]);

  const ui = pcdPackage ? getUI(pcdPackage.name) : undefined;

  let header = null;
  if (isMainIdentity) {
    header = <>ZUPASS IDENTITY</>;
  } else if (ui && ui.getHeader) {
    header = ui.getHeader({ pcd });
  } else if (displayOptions?.header) {
    header = <>{displayOptions.header.toUpperCase()}</>;
  }

  return header;
}

const CardFooter = memo(CardFooterImpl);

function CardFooterImpl({
  pcd,
  isMainIdentity
}: {
  pcd: PCD;
  isMainIdentity: boolean;
}): JSX.Element | null {
  const { dispatch } = useContext(StateContext);

  const onRemoveClick = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to remove this PCD? It will be permanently deleted!"
      )
    ) {
      dispatch({ type: "remove-pcd", id: pcd.id });
    }
  }, [pcd, dispatch]);

  if (isMainIdentity) {
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

function getUI(
  pcdPackageName: string
): PCDUI<PCD<unknown, unknown>, unknown> | undefined {
  return pcdPackageName in pcdRenderers
    ? (pcdRenderers as Record<string, PCDUI<PCD>>)[pcdPackageName]
    : undefined;
}

const getURLsBasedOnCategory = (
  category: TicketCategory
): { idBasedVerifyURL: string | undefined; verifyURL: string } => {
  const ticketCategory = category;
  const idBasedVerifyURL =
    ticketCategory === TicketCategory.Devconnect
      ? `${window.location.origin}/#/checkin-by-id`
      : ticketCategory === TicketCategory.ZuConnect
      ? `${window.location.origin}/#/verify`
      : ticketCategory === TicketCategory.Generic
      ? `${window.location.origin}/#/generic-checkin`
      : undefined;

  const verifyURL =
    ticketCategory === TicketCategory.Generic
      ? `${window.location.origin}/#/generic-checkin`
      : `${window.location.origin}/#/verify`;
  return { idBasedVerifyURL, verifyURL };
};

const QRContainer = styled.div`
  height: 265px;
  width: 265px;
`;
export const TicketQRWrapper = forwardRef<
  HTMLDivElement,
  {
    pcd: PCD<unknown, unknown>;
  }
>(({ pcd }, ref) => {
  const identityPCD = useUserIdentityPCD();

  if (isEdDSATicketPCD(pcd) && identityPCD) {
    const urls = getURLsBasedOnCategory(pcd.claim.ticket.ticketCategory);
    return (
      <QRContainer ref={ref}>
        <EddsaTicketQR
          pcd={pcd}
          idBasedVerifyURL={urls.idBasedVerifyURL}
          verifyURL={urls.verifyURL}
        />
      </QRContainer>
    );
  }
  if (isPODTicketPCD(pcd)) {
    const urls = getURLsBasedOnCategory(pcd.claim.ticket.ticketCategory);
    if (urls.idBasedVerifyURL)
      return (
        <QRContainer ref={ref}>
          <PODTicketQR
            ticketData={pcd.claim.ticket}
            idBasedVerifyURL={urls.idBasedVerifyURL}
          />
        </QRContainer>
      );
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
});

/**
 * EdDSATicketPCD cards require some extra context and configuration. In
 * particular, they require access to the user's identity PCD for generation
 * of ZK proofs, and can be configured to include different URLs in their QR
 * codes based on the type of ticket provided.
 */
const TicketWrapper = forwardRef<
  HTMLDivElement,
  {
    pcd: EdDSATicketPCD;
    hidePadding?: boolean;
    addOns?: AddOnsProps;
    showDownloadButton?: boolean;
  }
>(({ pcd, hidePadding, addOns, showDownloadButton }, ref) => {
  const Card = EdDSATicketPCDUI.renderCardBody;
  const identityPCD = useUserIdentityPCD();
  const ticketCategory = pcd.claim.ticket.ticketCategory;
  // If using only an ID in the URL, choose different verification screen based
  // on ticket category. Worth remembering that this does not check the public
  // key of the issuer.
  // If the `idBasedVerifyURL` is set, then the QR code will default to
  // encoding some simple data, with "ZK mode" as an alternate option. ZK mode
  // encodes an entire serialized ZKEdDSAEventTicketPCD in the query string,
  // which may make the resulting QR code difficult to scan on some devices.
  // If idBasedVerifyURL is undefined, then "ZK mode" is forcibly enabled and
  // there is no option of a simpler query parameter and smaller QR code.
  // Because ID-based verification relies on the server to do something, we
  // only enable it for tickets we think can use it (see caveat about the
  // issuer public key above; we are using the ticket category as a heuristic
  // but it's possible for third-party tickets to use these categories even if
  // we won't be able to do ID-based verification for them).
  const idBasedVerifyURL =
    ticketCategory === TicketCategory.Devconnect
      ? `${window.location.origin}/#/checkin-by-id`
      : ticketCategory === TicketCategory.ZuConnect
      ? `${window.location.origin}/#/verify`
      : ticketCategory === TicketCategory.Generic
      ? `${window.location.origin}/#/generic-checkin`
      : undefined;

  // In the long run, we will want issuers to be able to provide more metadata
  // about how check-in should work, either in the PCD itself or to be looked
  // up via some kind of registry (e.g. starting from the issuer's public key).
  // This might include having check-in happen at a third-party URL.
  // For now, we can assume that all "Generic" tickets are coming from the
  // Zupass generic issuance server. This will change, but that change will
  // probably occur alongside other changes (e.g. ZKDF tickets) that make it
  // seem unnecessary to future-proof at this stage.
  const verifyURL =
    ticketCategory === TicketCategory.Generic
      ? `${window.location.origin}/#/generic-checkin`
      : `${window.location.origin}/#/verify`;

  return identityPCD ? (
    <div
      ref={ref}
      id={pcd.claim.ticket.eventId + pcd.claim.ticket.attendeeEmail}
    >
      <Card
        hidePadding={hidePadding}
        pcd={pcd}
        verifyURL={verifyURL}
        idBasedVerifyURL={idBasedVerifyURL}
        addOns={addOns}
        showDownloadButton={showDownloadButton}
      />
    </div>
  ) : null;
});
export type AddOnsProps = {
  onClick: () => void;
  text: string;
};
type CardBodyProps = {
  pcd: PCD;
  isMainIdentity: boolean;
  hidePadding?: boolean;
  addOns?: AddOnsProps;
  showDownloadButton?: boolean;
  deletePodPcd?: () => Promise<void>;
};

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  (
    {
      pcd,
      isMainIdentity,
      hidePadding,
      addOns,
      showDownloadButton,
      deletePodPcd
    },
    ref
  ) => {
    const pcdCollection = usePCDCollection();

    if (isMainIdentity) {
      return <MainIdentityCard />;
    }
    if (pcdCollection.hasPackage(pcd.type)) {
      if (isEdDSATicketPCD(pcd)) {
        return (
          <TicketWrapper
            showDownloadButton={showDownloadButton}
            ref={ref}
            pcd={pcd}
            hidePadding={hidePadding}
          />
        );
      }
      if (isPODTicketPCD(pcd)) {
        const Component = PODTicketPCDUI.renderCardBody;
        return (
          <div
            ref={ref}
            id={pcd.claim.ticket.eventId + pcd.claim.ticket.attendeeEmail}
          >
            <Component
              showDownoladButton={showDownloadButton}
              ticketData={pcd.claim.ticket}
              addOns={addOns}
              pcd={pcd}
              idBasedVerifyURL={`${window.location.origin}/#/generic-checkin`}
            />
          </div>
        );
      }
      if (isPODPCD(pcd)) {
        const Component = PODPCDUI.renderCardBody;
        return <Component pcd={pcd} deletePcd={deletePodPcd} />;
      }
      const ui = getUI(pcd.type);
      if (ui) {
        const Component = ui.renderCardBody;
        return <Component pcd={pcd} />;
      } else {
        console.warn(`Could not find a UI renderer for PCD type "${pcd.type}"`);
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
);
export const CardContainer = styled.div`
  width: 100%;
`;

export const CardOutlineExpanded = styled.div`
  ${({ disabled }: { disabled?: boolean }): FlattenSimpleInterpolation => css`
    width: 100%;
    border-radius: 12px;
    overflow: hidden;

    ${disabled &&
    css`
      opacity: 0.7;
    `}
  `}
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
  ${({
    isMainIdentity
  }: {
    isMainIdentity?: boolean;
  }): FlattenSimpleInterpolation => css`
    text-align: center;
    padding: 10px;

    ${isMainIdentity
      ? css`
          background: var(--primary-darker);
        `
      : css``}
  `}
`;

const FooterContainer = styled.div`
  padding: 0px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

export const CardBodyContainer = styled.div`
  background-color: white;
  color: var(--bg-dark-primary);
`;
