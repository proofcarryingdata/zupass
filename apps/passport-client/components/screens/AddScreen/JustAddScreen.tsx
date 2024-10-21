import {
  PCDAddRequest,
  ProtocolWorldsFolderName
} from "@pcd/passport-interface";
import { ErrorContainer } from "@pcd/passport-ui";
import { getErrorMessage } from "@pcd/util";
import { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import {
  useCredentialManager,
  useDispatch,
  useIsSyncSettled,
  useSelf
} from "../../../src/appHooks";
import { mintPODPCD } from "../../../src/mintUtils";
import {
  clearAllPendingRequests,
  pendingRequestKeys
} from "../../../src/sessionStorage";
import { useDeserialized } from "../../../src/useDeserialized";
import { err } from "../../../src/util";
import { Button, H2, Spacer } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { MaybeModal } from "../../modals/Modal";
import { AddedPCD } from "../../shared/AddedPCD";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";
import { ProtocolWorldsStyling } from "../ProtocolWorldsScreens/ProtocolWorldsStyling";

/**
 * Screen that allows the user to respond to a `PCDAddRequest` and add
 * a PCD into their wallet without proving it.
 */
export function JustAddScreen({
  request,
  autoAdd
}: {
  request: PCDAddRequest;
  autoAdd: boolean; // Automatically add item on load
}): JSX.Element {
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const { error: deserializeError, pcd } = useDeserialized(request.pcd);
  const syncSettled = useIsSyncSettled();
  const self = useSelf();
  const isMintable =
    request.pcd.type === "pod-pcd" && request.mintUrl !== undefined;
  const semaphoreSignaturePCD = useCredentialManager().requestCredential({
    signatureType: "sempahore-signature-pcd"
  });
  const isProtocolWorlds = request.folder === ProtocolWorldsFolderName;
  const hasAutoAdded = useRef(false);

  const onAddClick = useCallback(async () => {
    // If not logged in, direct user to log in
    if (!self) {
      clearAllPendingRequests();
      const stringifiedRequest = JSON.stringify(request ?? "");

      sessionStorage.setItem(pendingRequestKeys.add, stringifiedRequest);
      window.location.href = `/#/login?redirectedFromAction=true&${
        pendingRequestKeys.add
      }=${encodeURIComponent(stringifiedRequest)}`;
      return;
    }

    try {
      // This is mostly for typechecking and should never throw
      // because <AddScreen /> checks if the user is logged in

      // If the (POD)PCD is mintable, mint it first.
      const maybeSerialisedMintedPCD = isMintable
        ? await mintPODPCD(
            request.mintUrl as string,
            request.pcd,
            await semaphoreSignaturePCD
          )
        : request.pcd;

      await dispatch({
        type: "add-pcds",
        pcds: [maybeSerialisedMintedPCD],
        folder: request.folder
      });

      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", getErrorMessage(e));
    }
  }, [dispatch, self, isMintable, request, semaphoreSignaturePCD]);

  useEffect(() => {
    if (autoAdd && !hasAutoAdded.current) {
      onAddClick();
      hasAutoAdded.current = true;
    }
  }, [autoAdd, onAddClick]);

  let content;

  if (self && !syncSettled) {
    return <SyncingPCDs />;
  } else if (!added) {
    content = (
      <>
        {isProtocolWorlds && <H2>{"TENSION DISCOVERED".toUpperCase()}</H2>}
        <Spacer h={16} />
        {pcd && (
          <PCDCard
            hidePadding={isProtocolWorlds}
            pcd={pcd}
            expanded={true}
            hideRemoveButton={true}
          />
        )}
        {pcd && !isProtocolWorlds && request.folder && (
          <div>
            This item will be added to folder:
            <br /> <strong>{request.folder}</strong>
          </div>
        )}
        {deserializeError && (
          <ErrorContainer>
            Deserialization error: {getErrorMessage(deserializeError)}
          </ErrorContainer>
        )}
        <Spacer h={16} />
        {pcd && (
          <Button onClick={onAddClick}>
            {isProtocolWorlds ? "Collect" : isMintable ? "Mint" : "Add"}
          </Button>
        )}
      </>
    );
  } else if (isProtocolWorlds) {
    window.location.hash = "#/?folder=Protocol%2520Worlds";
  } else if (request.redirectToFolder) {
    if (request.folder) {
      window.location.hash = `#/?folder=${encodeURIComponent(request.folder)}`;
    } else {
      window.location.hash = "#/";
    }
  } else if (autoAdd) {
    content = <RippleLoader />;
  } else {
    content = <AddedPCD onCloseClick={(): void => window.close()} />;
  }

  return (
    <>
      {isProtocolWorlds && <ProtocolWorldsStyling />}
      <MaybeModal fullScreen isProveOrAddScreen={true} />
      <AppContainer bg="primary">
        <Container>
          <Spacer h={16} />
          <AppHeader isProveOrAddScreen={true} />
          <Spacer h={16} />
          {content}
        </Container>
      </AppContainer>
    </>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  height: 100%;
  max-width: 100%;
`;
