import { Zapp } from "@parcnet-js/client-rpc";
import { ReactNode, useRef } from "react";
import styled from "styled-components";
import {
  DescriptiveAccordion,
  DescriptiveAccordionRef,
  DescriptiveAccrodionChild
} from "../../../new-components/shared/Accordion";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import { Button2 } from "../../../new-components/shared/Button";
import { useDispatch, useZapp, useZappOrigin } from "../../../src/appHooks";
import { BANNER_HEIGHT } from "../../../src/sharedConstants";
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
  const zappOrigin = useZappOrigin();
  return (
    <AppContainer bg="white" noPadding>
      <Container>
        <BottomModalHeader
          title="PERMISSION REQUEST"
          description={`${zappOrigin} requests the following permissions:`}
        />
        <Permissions zapp={zapp} />
      </Container>
    </AppContainer>
  );
}

function Permissions({ zapp }: { zapp: Zapp }): ReactNode {
  const dispatch = useDispatch();
  const ref = useRef<DescriptiveAccordionRef>(null);
  const chidren: DescriptiveAccrodionChild[] = [];
  if (zapp.permissions.READ_PUBLIC_IDENTIFIERS) {
    chidren.push({
      title: "Read public identifiers",
      description: `This will allow ${zapp.name} to read your
              public key and Semaphore commitment. Your email address will not
              be revealed.`
    });
  }
  if (zapp.permissions.SIGN_POD) {
    chidren.push({
      title: "Sign POD",
      description: `This will allow ${zapp.name} to sign PODs
                using your identity.`
    });
  }
  if (zapp.permissions.REQUEST_PROOF) {
    const collections = zapp.permissions.REQUEST_PROOF.collections.join(", ");
    chidren.push({
      title: `Request ZK proofs from ${collections}`,
      description: `This will allow ${zapp.name} to request zero-knowldge proofs using data from these collections: ${collections}`
    });
  }
  if (zapp.permissions.READ_POD) {
    const collections = zapp.permissions.READ_POD.collections.join(", ");
    chidren.push({
      title: `Read PODs from ${collections}`,
      description: `This will allow ${zapp.name} to read PODs from these collections: ${collections}`
    });
  }
  if (zapp.permissions.INSERT_POD) {
    const collections = zapp.permissions.INSERT_POD.collections.join(", ");
    chidren.push({
      title: `Insert PODs to ${collections}`,
      description: `This will allow ${zapp.name} to insert PODs to these collections: ${collections}`
    });
  }
  if (zapp.permissions.DELETE_POD) {
    const collections = zapp.permissions.DELETE_POD.collections.join(", ");
    chidren.push({
      title: `Delete PODs from ${collections}`,
      description: `This will allow ${zapp.name} to delete PODs from these collections: ${collections}`,
      color: "var(--new-danger)"
    });
  }

  if (zapp.permissions.SUGGEST_PODS) {
    const collections = zapp.permissions.SUGGEST_PODS.collections.join(", ");
    chidren.push({
      title: `Suggest PODs to ${collections}`,
      description: `This will allow ${zapp.name} to suggest PODs to these collections: ${collections}`
    });
  }

  return (
    <>
      <AccordionContainer>
        <DescriptiveAccordion
          ref={ref}
          children={chidren}
          title="permissions"
        />
      </AccordionContainer>
      <ButtonsContainer>
        <Button2
          onClick={() => dispatch({ type: "zapp-approval", approved: true })}
        >
          Approve
        </Button2>
        <Button2
          onClick={() => dispatch({ type: "zapp-approval", approved: false })}
          variant="secondary"
        >
          Decline
        </Button2>
      </ButtonsContainer>
    </>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: calc(100vh - ${BANNER_HEIGHT}px);
  padding: 24px 24px 20px 24px;
`;

const AccordionContainer = styled.div`
  width: 100%;
  min-height: 0px;
  overflow: scroll;
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
`;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: auto;
`;
