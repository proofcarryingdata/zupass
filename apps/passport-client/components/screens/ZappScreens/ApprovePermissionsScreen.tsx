import { Zapp } from "@parcnet-js/client-rpc";
import { Button, Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import styled from "styled-components";
import { useDispatch, useZapp, useZappOrigin } from "../../../src/appHooks";
import { H1, TextCenter } from "../../core";
import { AppContainer } from "../../shared/AppContainer";

/**
 * This screen is only ever shown in a popup modal. It is used when Zupass is
 * embedded in an iframe but has not been authenticated yet, and it opens a
 * popup window which will handle authentication and post an encryption key
 * back to the iframe.
 *
 * After we get the encryption key, we log in. This will trigger an event in
 * {@link useZappServer} which will tell the Zapp to close the modal window.
 */
export function ApprovePermissionsScreen(): ReactNode {
  const zapp = useZapp() as Zapp;
  const zappName = zapp?.name;
  const zappOrigin = useZappOrigin();
  return (
    <AppContainer bg="primary">
      <Spacer h={32} />
      <TextCenter>
        <H1>ZUPASS</H1>
      </TextCenter>
      <Spacer h={24} />
      <p>
        <ZappName>{zappName}</ZappName> ({zappOrigin}) requests the following
        permissions:
      </p>
      <Spacer h={24} />
      <Permissions zapp={zapp} />
    </AppContainer>
  );
}

function Permissions({ zapp }: { zapp: Zapp }): ReactNode {
  const dispatch = useDispatch();
  return (
    <>
      <PermissionsList>
        {zapp.permissions.READ_PUBLIC_IDENTIFIERS && (
          <PermissionItem>
            <PermissionName>Read public identifiers</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to read your
              public key and Semaphore commitment. Your email address will not
              be revealed.
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.SIGN_POD && (
          <PermissionItem>
            <PermissionName>Sign POD</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to sign PODs
              using your identity.
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.REQUEST_PROOF && (
          <PermissionItem>
            <PermissionName>Request proof</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to request
              zero-knowldge proofs using data from these collections:{" "}
              <strong>
                {zapp.permissions.REQUEST_PROOF.collections.join(", ")}
              </strong>
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.READ_POD && (
          <PermissionItem>
            <PermissionName>Read PODs</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to read PODs from
              these collections:{" "}
              <strong>
                {zapp.permissions.READ_POD.collections.join(", ")}
              </strong>
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.INSERT_POD && (
          <PermissionItem>
            <PermissionName>Insert PODs</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to insert PODs
              into these collections:{" "}
              <strong>
                {zapp.permissions.INSERT_POD.collections.join(", ")}
              </strong>
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.DELETE_POD && (
          <PermissionItem>
            <PermissionName>Delete PODs</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to delete PODs
              from these collections:{" "}
              <strong>
                {zapp.permissions.DELETE_POD.collections.join(", ")}
              </strong>
            </PermissionDescription>
          </PermissionItem>
        )}
        {zapp.permissions.SUGGEST_PODS && (
          <PermissionItem>
            <PermissionName>Suggest PODs</PermissionName>
            <PermissionDescription>
              This will allow <ZappName>{zapp.name}</ZappName> to suggest PODs
              for these collections:{" "}
              <strong>
                {zapp.permissions.SUGGEST_PODS.collections.join(", ")}
              </strong>
            </PermissionDescription>
          </PermissionItem>
        )}
      </PermissionsList>
      <Spacer h={24} />
      <Button
        onClick={() => dispatch({ type: "zapp-approval", approved: true })}
      >
        Approve
      </Button>
      <Spacer h={16} />
      <Button
        onClick={() => dispatch({ type: "zapp-approval", approved: false })}
        style="secondary"
      >
        Decline
      </Button>
      <Spacer h={16} />
      <TextCenter>
        <DeclineText>
          Declining will prevent <ZappName>{zapp.name}</ZappName> from accessing
          your data but may prevent you from using some features of the app.
        </DeclineText>
      </TextCenter>
      <Spacer h={24} />
    </>
  );
}

const ZappName = styled.span`
  font-weight: bold;
`;

const PermissionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PermissionItem = styled.div``;

const PermissionName = styled.div`
  font-weight: bold;
`;

const PermissionDescription = styled.div`
  font-size: 0.9rem;
`;

const DeclineText = styled.div`
  font-size: 0.8rem;
`;
