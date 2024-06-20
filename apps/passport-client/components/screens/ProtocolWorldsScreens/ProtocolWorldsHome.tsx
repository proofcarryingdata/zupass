import { Separator } from "@pcd/passport-ui";
import { useEffect } from "react";
import styled from "styled-components";
import {
  useFolders,
  useLoadedIssuedPCDs,
  usePCDsInFolder
} from "../../../src/appHooks";
import { RippleLoader } from "../../core/RippleLoader";
import { PCDCardList } from "../../shared/PCDCardList";

export function ProtocolWorldsHome(): JSX.Element {
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--bg-dark-primary", "rgb(141,141,141)");
    rootStyle.setProperty("--bg-dark-gray", "rgb(109,109,109)");
    rootStyle.setProperty("--bg-lite-primary", "black");
    rootStyle.setProperty("--primary-dark", "rgb(174,174,174)");
    rootStyle.setProperty("--primary-lite", "white");
    rootStyle.setProperty("--accent-dark", "white");
    rootStyle.setProperty("--accent-lite", "white");
    // rootStyle.setProperty("--accent-lite", "white");
    return () => {
      rootStyle.removeProperty("--bg-dark-primary");
      rootStyle.removeProperty("--bg-dark-gray");
      rootStyle.removeProperty("--bg-lite-primary");
      rootStyle.removeProperty("--primary-dark");
      rootStyle.removeProperty("--primary-lite");
      rootStyle.removeProperty("--accent-dark");
      rootStyle.removeProperty("--accent-lite");
    };
  }, []);
  const foldersInFolder = useFolders("Protocol Worlds");
  const pcdsInFolder = usePCDsInFolder("Protocol Worlds");
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  return (
    <>
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
