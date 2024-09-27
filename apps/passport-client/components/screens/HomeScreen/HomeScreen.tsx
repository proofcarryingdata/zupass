import {
  EdgeCityFolderName,
  FrogCryptoFolderName
} from "@pcd/passport-interface";
import { isRootFolder, normalizePath } from "@pcd/pcd-collection";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled, { CSSProperties } from "styled-components";
import { appConfig } from "../../../src/appConfig";
import {
  useDispatch,
  useFolders,
  useLoadedIssuedPCDs,
  useSelf,
  useVisiblePCDsInFolder,
  useWrappedPCDCollection
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import {
  isEdgeCityFolder,
  isFrogCryptoFolder,
  isProtocolWorldsFolder
} from "../../../src/util";
import { Button, Placeholder, Spacer } from "../../core";
import { RippleLoader } from "../../core/RippleLoader";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { AppHeader } from "../../shared/AppHeader";
import { LoadingIssuedPCDs } from "../../shared/LoadingIssuedPCDs";
import { PCDCardList } from "../../shared/PCDCardList";
import { EdgeCityHome } from "../EdgeCityScreens/EdgeCityHome";
import { FrogCryptoHomeSection } from "../FrogScreens/FrogCryptoHomeSection";
import { FrogFolder } from "../FrogScreens/FrogFolder";
import { ProtocolWorldsHome } from "../ProtocolWorldsScreens/ProtocolWorldsHome";
import { ZappScreen } from "../ZappScreens/ZappScreen";
import {
  FolderCard,
  FolderDetails,
  FolderEntryContainer,
  FolderExplorerContainer
} from "./Folder";

export const HomeScreen = React.memo(HomeScreenImpl);

const FOLDER_QUERY_PARAM = "folder";

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function HomeScreenImpl(): JSX.Element | null {
  useSyncE2EEStorage();
  const self = useSelf();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loadedIssuedPCDs = useLoadedIssuedPCDs();

  const [searchParams, setSearchParams] = useSearchParams();
  const defaultBrowsingFolder = useMemo(() => {
    const folderPathFromQuery = decodeURIComponent(
      searchParams.get(FOLDER_QUERY_PARAM) ?? ""
    );
    if (!folderPathFromQuery) {
      return "";
    }
    // FrogCrypto is always valid even if user doesn't have any FrogPCD
    if (folderPathFromQuery === FrogCryptoFolderName) {
      return folderPathFromQuery;
    }

    return folderPathFromQuery || "";
  }, [searchParams]);

  const [browsingFolder, setBrowsingFolder] = useState(defaultBrowsingFolder);
  const pcdsInFolder = useVisiblePCDsInFolder(browsingFolder);
  const foldersInFolder = useFolders(browsingFolder);

  useEffect(() => {
    if (!self) {
      console.log("Redirecting to login screen");
      navigate("/login", { replace: true });
    }
  });

  useEffect(() => {
    if (sessionStorage.newAddedPCDID) {
      // scroll to element with id of newAddedPCDID
      const el = document.getElementById(sessionStorage.newAddedPCDID);
      if (el) {
        el.scrollIntoView();
      }
      delete sessionStorage.newAddedPCDID;
    }
  });

  useEffect(() => {
    const oldParams = Object.fromEntries(searchParams.entries());

    if (browsingFolder !== EdgeCityFolderName) {
      delete oldParams["tab"];
    }

    if (!browsingFolder) {
      delete oldParams[FOLDER_QUERY_PARAM];

      setSearchParams({
        ...oldParams
      });
    } else if (oldParams[FOLDER_QUERY_PARAM] !== browsingFolder) {
      setSearchParams({
        ...oldParams,
        [FOLDER_QUERY_PARAM]: encodeURIComponent(browsingFolder)
      });
    }
  }, [browsingFolder, searchParams, setSearchParams]);

  const onFolderClick = useCallback((folder: string) => {
    setBrowsingFolder(folder);
  }, []);

  const pcdCollection = useWrappedPCDCollection();
  const isRoot = isRootFolder(browsingFolder);
  const isFrogCrypto = isFrogCryptoFolder(browsingFolder);
  const isEdgeCity = isEdgeCityFolder(browsingFolder);
  const isProtocolWorlds = isProtocolWorldsFolder(browsingFolder);
  const isZappFolder = !!appConfig.embeddedZapps[browsingFolder];

  const shouldShowFrogCrypto = useMemo(() => {
    const folders = pcdCollection.value.getAllFolderNames();
    const goodFolders = [
      "Edge City",
      "ETHBerlin 04",
      "ETHPrague",
      "Zuzalu '23",
      "Devconnect",
      "ZuConnect",
      "0xPARC Summer '24"
    ].map(normalizePath);
    const hasGoodFolder = folders.map(normalizePath).some((f) => {
      return goodFolders.some((g) => f.startsWith(g));
    });
    return hasGoodFolder;
  }, [pcdCollection]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  const onRemoveAllClick = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to remove all PCDs in this folder? They will be permanently deleted!"
      )
    ) {
      dispatch({ type: "remove-all-pcds-in-folder", folder: browsingFolder });
    }
  }, [browsingFolder, dispatch]);

  if (!self) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <Spacer h={24} />
        <AppHeader isEdgeCity={isEdgeCity} />
        <Spacer h={24} />
        <Placeholder minH={540}>
          <LoadingIssuedPCDs />
          {!(foldersInFolder.length === 0 && isRoot) && (
            <FolderExplorerContainer>
              {!isRoot && (
                <FolderDetails
                  noChildFolders={isEdgeCity || foldersInFolder.length === 0}
                  folder={browsingFolder}
                  onFolderClick={onFolderClick}
                />
              )}
              {!isEdgeCity &&
                foldersInFolder
                  .filter(
                    // /FrogCrypto is a special and rendered by <FrogFolder />
                    (folder) => folder !== FrogCryptoFolderName
                  )
                  .sort((a, b) => a.localeCompare(b))
                  .map((folder) => {
                    return (
                      <FolderCard
                        style={
                          isEdgeCityFolder(folder)
                            ? {
                                fontFamily: "PressStart2P",
                                textTransform: "uppercase",
                                // TODO: other colors?
                                animation: "color-change 1s infinite"
                              }
                            : undefined
                        }
                        key={folder}
                        onFolderClick={onFolderClick}
                        folder={folder}
                      />
                    );
                  })}
              {isRoot && shouldShowFrogCrypto && (
                <FrogFolder
                  Container={FrogFolderContainer}
                  onFolderClick={onFolderClick}
                />
              )}
              {isRoot &&
                Object.keys(appConfig.embeddedZapps).map((folder) => (
                  <FolderCard
                    key={folder}
                    onFolderClick={onFolderClick}
                    folder={folder}
                  />
                ))}
            </FolderExplorerContainer>
          )}

          {isFrogCrypto ? (
            <FrogCryptoHomeSection />
          ) : isProtocolWorlds ? (
            <ProtocolWorldsHome />
          ) : isEdgeCity ? (
            <EdgeCityHome />
          ) : isZappFolder ? (
            <ZappScreen url={appConfig.embeddedZapps[browsingFolder]} />
          ) : (
            <>
              {!(foldersInFolder.length === 0 && isRoot) && <Separator />}
              {pcdsInFolder.length > 0 ? (
                <PCDCardList allExpanded pcds={pcdsInFolder} />
              ) : loadedIssuedPCDs ? (
                <NoPcdsContainer>This folder is empty</NoPcdsContainer>
              ) : (
                <RippleLoader />
              )}
              {pcdsInFolder.length > 1 && !isRoot && (
                <>
                  <Spacer h={16} />
                  <RemoveAllContainer>
                    <Button
                      style="danger"
                      size="small"
                      onClick={onRemoveAllClick}
                    >
                      Remove all
                    </Button>
                  </RemoveAllContainer>
                </>
              )}
            </>
          )}
        </Placeholder>
        <Spacer h={24} />
      </AppContainer>
    </>
  );
}

function FrogFolderContainer({
  children,
  onClick,
  style
}: {
  children?: ReactNode;
  style: CSSProperties;
  onClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}): JSX.Element {
  return (
    <FolderEntryContainer onClick={onClick} style={style}>
      {children}
    </FolderEntryContainer>
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

const Separator = styled.div`
  width: 100%;
  height: 1px;
  margin-top: 32px;
  margin-bottom: 32px;
  background-color: grey;
  user-select: none;
`;

const RemoveAllContainer = styled.div`
  padding: 0px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;
