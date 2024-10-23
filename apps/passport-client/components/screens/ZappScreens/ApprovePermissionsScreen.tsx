import { Zapp } from "@parcnet-js/client-rpc";
import { Button, Spacer } from "@pcd/passport-ui";
import { ReactNode } from "react";
import styled from "styled-components";
import { useDispatch, useZapp, useZappOrigin } from "../../../src/appHooks";
import { H1, TextCenter } from "../../core";
import { AppContainer } from "../../shared/AppContainer";
import { BottomModalHeader } from "../../../new-components/shared/BottomModal";
import {
  Accordion,
  DescriptiveAccordion,
  DescriptiveAccrodionChild
} from "../../../new-components/shared/Accordion";

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
  // const zappName = zapp?.name;
  const zappOrigin = useZappOrigin();
  return (
    <AppContainer bg="white">
      <BottomModalHeader
        title="PERMISSION REQUEST"
        description={`${zappOrigin} requests the following permissions:`}
      />
      <Permissions zapp={zapp} />
    </AppContainer>
  );
}

function Permissions({ zapp }: { zapp: Zapp }): ReactNode {
  const dispatch = useDispatch();

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
      )}`
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
  return (
    <>
      <AccordionContainer>
        <DescriptiveAccordion children={chidren} title="what the fuck" />
      </AccordionContainer>
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

const AccordionContainer = styled.div`
  width: 100%;
  max-height: 60vh;
  overflow: scroll;
`;
const ZappName = styled.span`
  font-weight: bold;
`;

const DeclineText = styled.div`
  font-size: 0.8rem;
`;
