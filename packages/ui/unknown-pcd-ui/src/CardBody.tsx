import { FieldLabel, Separator, styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";
import { UnknownPCD } from "@pcd/unknown-pcd";
import { getErrorMessage } from "@pcd/util";
import { useState } from "react";

export const UnknownPCDUI: PCDUI<UnknownPCD> = {
  renderCardBody: UnknownPCDCardBody
};

const Container = styled.div`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const SerializedPCDContainer = styled.div`
  word-wrap: break-word;
  word-break: break-all;
  white-space: normal;
  overflow-wrap: anywhere;
  max-height: 300px;
  overflow-y: auto;
`;

export const StyledLinkButton = styled.a`
  color: #e6a50f;
  cursor: pointer;
  text-decoration: none;
`;

/**
 * This component renders the body of a 'Card' that Zupass uses to display PCDs to the user.
 */
function UnknownPCDCardBody({ pcd }: { pcd: UnknownPCD }): JSX.Element {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Container>
      <p>Something went wrong reading this {pcd.claim.serializedPCD.type}.</p>
      {!!pcd.claim.error && (
        <>
          <br />
          <p>
            <b>{getErrorMessage(pcd.claim.error)}</b>
          </p>
        </>
      )}
      <br />
      <p>
        Try refreshing the page, or contact Zupass support if the problem
        persists.
      </p>
      <p>
        <StyledLinkButton onClick={(): void => setShowDetails(!showDetails)}>
          {showDetails ? "Hide" : "View"} details
        </StyledLinkButton>
      </p>
      {!!showDetails && <UnknownPCDDetails pcd={pcd} />}
    </Container>
  );
}

function UnknownPCDDetails({ pcd }: { pcd: UnknownPCD }): JSX.Element {
  return (
    <>
      <Separator />
      <FieldLabel>PCD Type</FieldLabel>
      <pre>{pcd.claim.serializedPCD.type}</pre>
      <FieldLabel>Error</FieldLabel>
      <pre style={{ overflowX: "auto" }}>
        {pcd.claim.error?.toString() || getErrorMessage(pcd.claim.error)}
      </pre>
      <FieldLabel>Serialized Content</FieldLabel>
      <SerializedPCDContainer>
        {pcd.claim.serializedPCD.pcd}
      </SerializedPCDContainer>
    </>
  );
}
