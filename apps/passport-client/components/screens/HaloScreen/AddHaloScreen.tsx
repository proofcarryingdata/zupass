import {
  HaLoNoncePCD,
  HaLoNoncePCDArgs,
  HaLoNoncePCDPackage,
} from "@pcd/halo-nonce-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { ReactNode, useCallback, useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { DispatchContext } from "../../../src/dispatch";
import {
  useHasUploaded,
  useIsDownloaded,
} from "../../../src/useSyncE2EEStorage";
import { err } from "../../../src/util";
import { Button, Spacer } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { PCDCard } from "../../shared/PCDCard";
import { SyncingPCDs } from "../../shared/SyncingPCDs";

export function AddHaloScreen({
  pk2,
  rnd,
  rndsig,
}: {
  pk2: string;
  rnd: string;
  rndsig: string;
}) {
  const [_state, dispatch] = useContext(DispatchContext);
  const [added, setAdded] = useState(false);
  const [pcd, setPCD] = useState<HaLoNoncePCD | undefined>(undefined);
  const hasUploaded = useHasUploaded();
  const isDownloaded = useIsDownloaded();

  useEffect(() => {
    const generatePCD = async () => {
      const args: HaLoNoncePCDArgs = {
        requestNewPCD: {
          argumentType: ArgumentTypeName.Boolean,
          value: false,
        },
        pk2: {
          argumentType: ArgumentTypeName.String,
          value: pk2,
        },
        rnd: {
          argumentType: ArgumentTypeName.String,
          value: rnd,
        },
        rndsig: {
          argumentType: ArgumentTypeName.String,
          value: rndsig,
        },
      };
      const producedPCD = await HaLoNoncePCDPackage.prove(args);
      setPCD(producedPCD);
    };

    generatePCD();
  }, [pk2, rnd, rndsig]);

  const onAddClick = useCallback(async () => {
    try {
      const serializedPCD = await HaLoNoncePCDPackage.serialize(pcd);
      await dispatch({ type: "add-pcd", pcd: serializedPCD });
      setAdded(true);
    } catch (e) {
      await err(dispatch, "Error Adding PCD", e.message);
    }
  }, [dispatch, pcd]);

  let content: ReactNode;

  if (!isDownloaded || !pcd) {
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
  } else if (!hasUploaded) {
    return <SyncingPCDs />;
  } else {
    sessionStorage.newAddedPCDID = pcd.id;
    window.location.href = "/#/";
    return null;
  }

  return (
    <AppContainer bg="gray">
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
