import { ProtocolWorldsFolderName } from "@pcd/passport-interface";
import { Separator } from "@pcd/passport-ui";
import styled from "styled-components";
import {
  useFolders,
  useLoadedIssuedPCDs,
  usePCDsInFolder
} from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { PCDCardList } from "../../shared/PCDCardList";
import { ProtocolWorldsStyling } from "./ProtocolWorldsStyling";

export function ProtocolWorldsHome(): JSX.Element {
  const foldersInFolder = useFolders(ProtocolWorldsFolderName);
  const pcdsInFolder = usePCDsInFolder(ProtocolWorldsFolderName);
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  return (
    <>
      <ProtocolWorldsStyling />
      {!(foldersInFolder.length === 0) && <Separator />}
      {pcdsInFolder.length > 0 ? (
        <PCDCardList hideRemoveButton allExpanded pcds={pcdsInFolder} />
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
