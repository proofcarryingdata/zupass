import {
  HaLoNoncePCD,
  HaLoNoncePCDArgs,
  HaLoNoncePCDPackage
} from "@pcd/halo-nonce-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { getErrorMessage } from "@pcd/util";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  useDispatch,
  useIsLoggedIn,
  useIsSyncSettled
} from "../../../src/appHooks";
import {
  clearAllPendingRequests,
  setPendingHaloRequest
} from "../../../src/sessionStorage";
import { err } from "../../../src/util";
import { Button, Spacer, TextCenter } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

export function AddHaloScreen({
  pk2,
  rnd,
  rndsig
}: {
  pk2: string;
  rnd: string;
  rndsig: string;
}): JSX.Element | null {
  const location = useLocation();
  const dispatch = useDispatch();
  const [added, setAdded] = useState(false);
  const [pcd, setPCD] = useState<HaLoNoncePCD | undefined>(undefined);
  const [invalidPCD, setInvalidPCD] = useState(false);
  const loggedIn = useIsLoggedIn();
  const syncSettled = useIsSyncSettled();

  useEffect(() => {
    const generatePCD = async (): Promise<void> => {
      const args: HaLoNoncePCDArgs = {
        pk2: {
          argumentType: ArgumentTypeName.String,
          value: pk2
        },
        rnd: {
          argumentType: ArgumentTypeName.String,
          value: rnd
        },
        rndsig: {
          argumentType: ArgumentTypeName.String,
          value: rndsig
        }
      };

      let producedPCD;
      try {
        producedPCD = await HaLoNoncePCDPackage.prove(args);
        if (!(await HaLoNoncePCDPackage.verify(producedPCD))) {
          err(dispatch, "Error Generating PCD", "PCD failed to verify");
          setInvalidPCD(true);
        }
        setPCD(producedPCD);
      } catch (e) {
        err(dispatch, "Error Generating PCD", getErrorMessage(e));
        setInvalidPCD(true);
      }
    };

    generatePCD();
  }, [pk2, rnd, rndsig, dispatch]);

  const onAddClick = useCallback(async () => {
    try {
      if (!pcd) {
        throw new Error("No valid PCD found");
      }
      const serializedPCD = await HaLoNoncePCDPackage.serialize(pcd);
      await dispatch({ type: "add-pcds", pcds: [serializedPCD] });
      setAdded(true);
    } catch (e) {
      err(dispatch, "Error Adding PCD", getErrorMessage(e));
    }
  }, [dispatch, pcd]);

  const onLoginClick = (): void => {
    clearAllPendingRequests();
    setPendingHaloRequest(location.search);
    window.location.href = "/#/login?redirectedFromAction=true";
  };

  let content: ReactNode;

  if (invalidPCD) {
    return <AppContainer bg="primary" />;
  } else if (!pcd) {
    return <SyncingPCDs />;
  } else if (!loggedIn) {
    return (
      <AppContainer bg="primary">
        <MaybeModal fullScreen />
        <Container>
          <Spacer h={16} />
          <Spacer h={16} />
          {pcd && <PCDCard pcd={pcd} expanded={true} hideRemoveButton={true} />}
          <Spacer h={16} />
          <TextCenter>
            <p>
              To add this stamp, login to your Zupass or copy this link into a
              logged in device.
            </p>
          </TextCenter>
          <Spacer h={16} />
          <Button onClick={onLoginClick}>Login</Button>
        </Container>
      </AppContainer>
    );
  } else if (!syncSettled) {
    return <SyncingPCDs />;
  } else if (!added) {
    content = (
      <>
        <Spacer h={16} />
        {pcd && <PCDCard pcd={pcd} expanded={true} hideRemoveButton={true} />}
        <Spacer h={16} />
        <Button onClick={onAddClick}>Add</Button>
      </>
    );
  } else {
    sessionStorage.newAddedPCDID = pcd.id;
    window.location.href = "/#/";
    return null;
  }

  return (
    <AppContainer bg="primary">
      <MaybeModal fullScreen />
      <Container>
        <Spacer h={16} />
        <AppHeader />
        <Spacer h={16} />
        {content}
      </Container>
    </AppContainer>
  );
}

const Container = styled.div`
  padding: 16px;
  width: 100%;
  max-width: 100%;
`;
