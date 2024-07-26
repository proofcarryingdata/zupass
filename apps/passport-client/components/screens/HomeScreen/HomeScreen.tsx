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
  useRef,
  useState
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import styled, { CSSProperties } from "styled-components";
import { useLocalStorage } from "usehooks-ts";
import {
  useDispatch,
  useFolders,
  useLoadedIssuedPCDs,
  useSelf,
  useStateContext,
  useVisiblePCDsInFolder,
  useWrappedPCDCollection
} from "../../../src/appHooks";
import { useSyncE2EEStorage } from "../../../src/useSyncE2EEStorage";
import {
  cn,
  isEdgeCityFolder,
  isFrogCryptoFolder,
  isProtocolWorldsFolder
} from "../../../src/util";
import { NewButton } from "../../NewButton";
import { H1, Placeholder, Spacer, ZuLogo } from "../../core";
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
import {
  FolderCard,
  FolderDetails,
  FolderEntryContainer,
  FolderEventInfo,
  FolderExplorerContainer
} from "./Folder";
import { EVENTS, initTestData, isEvent } from "./utils";

export const HomeScreen = React.memo(HomeScreenImpl);

const FOLDER_QUERY_PARAM = "folder";

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function HomeScreenImpl(): JSX.Element | null {
  const state = useStateContext().getState();
  const stateHolder = useRef(state);

  useEffect(() => {
    if (stateHolder.current) {
      initTestData(stateHolder.current);
    }
  }, []);

  const [justDevcon, setJustDevcon] = useLocalStorage("justDevcon", false);
  useSyncE2EEStorage();
  const self = useSelf();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loadedIssuedPCDs = useLoadedIssuedPCDs();
  const isOther = useLocation().pathname.startsWith("/other");

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
  const shouldShowFrogCrypto = useMemo(() => {
    const folders = pcdCollection.value.getAllFolderNames();
    const goodFolders = [
      "Edge City",
      "ETHBerlin 04",
      "ETHPrague",
      "Zuzalu '23",
      "Devconnect",
      "ZuConnect"
    ].map(normalizePath);
    const hasGoodFolder = folders.map(normalizePath).some((f) => {
      return goodFolders.some((g) => f.startsWith(g));
    });
    return hasGoodFolder && false;
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

  const [showOlder, setShowOlder] = useState(false);
  const displayingFolders = useMemo(() => {
    const showingFolders = foldersInFolder
      .filter(
        // FrogCrypto is a special and rendered by <FrogFolder />
        (folder) => folder !== FrogCryptoFolderName
      )
      .filter((f) => (isOther ? !isEvent(f) : isEvent(f)))
      .filter((f) => isOther || !justDevcon || f === "Devcon")
      .sort((a, b) => {
        const eventA = EVENTS[a];
        const eventB = EVENTS[b];

        if (eventA && eventB) {
          return eventB.start.localeCompare(eventA.start);
        }

        return a.localeCompare(b);
      });

    return showingFolders;
  }, [foldersInFolder, isOther, justDevcon]);

  if (!self) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <div className="flex-row flex align-center items-center gap-3">
          <ZuLogo width="48px" /> <H1 className="">Zupass</H1>
        </div>
        <Spacer h={24} />
        {isRoot && !isOther && <AppHeader isEdgeCity={isEdgeCity} />}
        <Placeholder minH={540}>
          {isRoot && !isOther && (
            <NewButton
              style={{ marginBottom: "0.75rem" }}
              onClick={() => {
                window.location.href = "#/more";
              }}
            >
              More Cryptography
            </NewButton>
          )}
          {isRoot && isOther && (
            <>
              <FolderDetails
                noChildFolders={isEdgeCity || foldersInFolder.length === 0}
                folder={browsingFolder}
                onFolderClick={() => {
                  window.location.href = "#/";
                }}
              />
              <div className="h-[0.75rem]"></div>
            </>
          )}

          {/* {isRoot && (
            <div className="font-bold text-3xl mb-4 text-center">My Events</div>
          )} */}
          {!(foldersInFolder.length === 0 && isRoot) && (
            <FolderExplorerContainer className="flex flex-col gap-3">
              {!isRoot && (
                <FolderDetails
                  noChildFolders={isEdgeCity || foldersInFolder.length === 0}
                  folder={browsingFolder}
                  onFolderClick={onFolderClick}
                />
              )}
              {isEvent(browsingFolder) && (
                <FolderEventInfo folder={browsingFolder} />
              )}

              {!isEdgeCity && (
                <>
                  {displayingFolders.slice(0, 5).map((folder) => {
                    return (
                      <FolderCard
                        key={folder}
                        onFolderClick={onFolderClick}
                        folder={folder}
                      />
                    );
                  })}
                  {showOlder && displayingFolders.length > 5 && (
                    <>
                      {displayingFolders.slice(5).map((folder) => {
                        return (
                          <FolderCard
                            key={folder}
                            onFolderClick={onFolderClick}
                            folder={folder}
                          />
                        );
                      })}
                    </>
                  )}
                  {displayingFolders.length > 5 && (
                    <>
                      <div
                        className={cn(
                          "border-4 border-cyan-950",
                          "text-center",
                          "bg-cyan-700 py-2 px-4 cursor-pointer hover:bg-cyan-600  transition-all duration-100",
                          "rounded font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
                          "text-lg"
                        )}
                        onClick={() => {
                          setShowOlder((show) => !show);
                        }}
                      >
                        {showOlder ? "Hide Older Events" : "Show Older Events"}
                      </div>
                    </>
                  )}
                </>
              )}
              {isRoot && !isOther && (
                <>
                  <div
                    className={cn(
                      "border-4 border-cyan-950",
                      "text-center",
                      "bg-cyan-700 py-2 px-4 cursor-pointer hover:bg-cyan-600  transition-all duration-100",
                      "rounded font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
                      "text-lg"
                    )}
                    onClick={() => {
                      window.location.href = "#/other";
                    }}
                  >
                    Other Data
                  </div>
                </>
              )}
              {isRoot && shouldShowFrogCrypto && (
                <FrogFolder
                  Container={FrogFolderContainer}
                  onFolderClick={onFolderClick}
                />
              )}
            </FolderExplorerContainer>
          )}

          {isFrogCrypto ? (
            <FrogCryptoHomeSection />
          ) : isProtocolWorlds ? (
            <ProtocolWorldsHome />
          ) : isEdgeCity ? (
            <EdgeCityHome />
          ) : (
            <>
              {/* {!(foldersInFolder.length === 0 && isRoot) && <Separator />} */}
              {pcdsInFolder.length > 0 ? (
                <PCDCardList
                  key={browsingFolder + isRoot + isOther}
                  allExpanded
                  pcds={pcdsInFolder.filter((_) => !isRoot || isOther)}
                />
              ) : loadedIssuedPCDs ? (
                <NoPcdsContainer>This folder is empty</NoPcdsContainer>
              ) : (
                <RippleLoader />
              )}
              {/* {pcdsInFolder.length > 1 && !isRoot && (
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
              )} */}
              <LoadingIssuedPCDs />
            </>
          )}
          {loadedIssuedPCDs && (
            <div
              onClick={() => {
                dispatch({
                  type: "set-modal",
                  modal: { modalType: "no-tickets" }
                });
              }}
              className="text-center font-sm text-gray-300 mt-[0.75rem] select-none hover:underline cursor-pointer"
            >
              Don't see your tickets?
            </div>
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
  margin-top: 12px;
  margin-bottom: 12px;
  user-select: none;
`;

const RemoveAllContainer = styled.div`
  padding: 0px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;
