import {
  ProtocolWorldsFolderName,
  requestLogToServer
} from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import { useEffect } from "react";
import styled from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useFolders,
  useLoadedIssuedPCDs,
  usePCDsInFolder,
  useSelf
} from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { PCDCardList } from "../../shared/PCDCardList";
import { ProtocolWorldsStyling } from "./ProtocolWorldsStyling";

export function ProtocolWorldsHome(): JSX.Element {
  const foldersInFolder = useFolders(ProtocolWorldsFolderName);
  const pcdsInFolder = usePCDsInFolder(ProtocolWorldsFolderName);
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const self = useSelf();

  useEffect(() => {
    requestLogToServer(appConfig.zupassServer, "protocol_worlds_score", {
      score: pcdsInFolder.length,
      commitment: self?.commitment
    });
  }, [pcdsInFolder, self]);

  return (
    <>
      <ProtocolWorldsStyling />
      {!(foldersInFolder.length === 0) && <Separator />}
      {pcdsInFolder.length > 0 ? (
        <PCDCardList
          hidePadding
          hideRemoveButton
          allExpanded
          pcds={pcdsInFolder}
        />
      ) : loadedIssuedPCDs ? (
        <NoPcdsContainer>This folder is empty</NoPcdsContainer>
      ) : (
        <RippleLoader />
      )}
    </>
  );
}

const NoPcdsContainer = styled.div`
  padding: 32;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  color: rgba(255, 255, 255, 0.7);
`;
