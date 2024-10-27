import { Zapp } from "@parcnet-js/client-rpc";
import { ReactNode, useLayoutEffect, useRef } from "react";
import styled from "styled-components";
import { useDispatch, useZapp, useZappOrigin } from "../../../src/appHooks";
import { AppContainer } from "../../shared/AppContainer";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import {
  DescriptiveAccordion,
  DescriptiveAccordionRef,
  DescriptiveAccrodionChild
} from "../../../new-components/shared/Accordion";
import { Button2 } from "../../../new-components/shared/Button";

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
    chidren.push({
      title: "Request proof",
      description: `This will allow ${
        zapp.name
      } to request zero-knowldge proofs using data from these collections: ${zapp.permissions.REQUEST_PROOF.collections.join(
        ","
      )}`
    });
  }
  if (zapp.permissions.READ_POD) {
    chidren.push({
      title: "Read PODs",
      description: `This will allow ${
        zapp.name
      } to read PODs from these collections: ${zapp.permissions.READ_POD.collections.join(
        ","
      )}`
    });
  }
  if (zapp.permissions.INSERT_POD) {
    chidren.push({
      title: "Insert PODs",
      description: `This will allow ${
        zapp.name
      } to insert PODs from these collections: ${zapp.permissions.INSERT_POD.collections.join(
        ","
      )}`
    });
  }
  if (zapp.permissions.DELETE_POD) {
    chidren.push({
      title: "Delete PODs",
      description: `This will allow ${
        zapp.name
      } to delete PODs from these collections: ${zapp.permissions.DELETE_POD.collections.join(
        ","
      )}`,
      color: "var(--new-danger)"
    });
  }

  if (zapp.permissions.SUGGEST_PODS) {
    chidren.push({
      title: "Suggest PODs",
      description: `This will allow ${
        zapp.name
      } to suggest PODs from these collections: ${zapp.permissions.SUGGEST_PODS.collections.join(
        ","
      )}`
    });
  }

  useLayoutEffect(() => {
    ref.current?.openAll();
  }, []);
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
  // justify-content: space-between;
  height: 100vh;
  padding: 24px 24px 20px 24px;
`;

const AccordionContainer = styled.div`
  width: 100%;
  // max-height: calc(70vh);
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
