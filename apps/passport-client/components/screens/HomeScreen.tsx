import { FrogCryptoFolderName } from "@pcd/passport-interface";
import { icons } from "@pcd/passport-ui";
import {
  getNameFromPath,
  getParentFolder,
  isRootFolder
} from "@pcd/pcd-collection";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import {
  useDispatch,
  useFolders,
  usePCDCollection,
  usePCDsInFolder,
  useSelf
} from "../../src/appHooks";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { isFrogCryptoFolder } from "../../src/util";
import { Button, Placeholder, Spacer } from "../core";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";
import { LoadingIssuedPCDs } from "../shared/LoadingIssuedPCDs";
import { PCDCardList } from "../shared/PCDCardList";
import { FrogFolder } from "./FrogScreens/FrogFolder";
import { FrogHomeSection } from "./FrogScreens/FrogHomeSection";

export const HomeScreen = React.memo(HomeScreenImpl);

const FOLDER_QUERY_PARAM = "folder";

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function HomeScreenImpl(): JSX.Element {
  useSyncE2EEStorage();
  const self = useSelf();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const pcdCollection = usePCDCollection();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultBrowsingFolder = useMemo(() => {
    const folderPathFromQuery = decodeURIComponent(
      searchParams.get(FOLDER_QUERY_PARAM)
    );
    if (!folderPathFromQuery) {
      return "";
    }
    // FrogCrypto is always valid even if user doesn't have any FrogPCD
    if (folderPathFromQuery === FrogCryptoFolderName) {
      return folderPathFromQuery;
    }

    return pcdCollection.isValidFolder(folderPathFromQuery)
      ? folderPathFromQuery
      : "";
  }, [pcdCollection, searchParams]);

  const [browsingFolder, setBrowsingFolder] = useState(defaultBrowsingFolder);
  const pcdsInFolder = usePCDsInFolder(browsingFolder);
  const foldersInFolder = useFolders(browsingFolder);

  useEffect(() => {
    if (self == null) {
      console.log("Redirecting to login screen");
      navigate("/login", { replace: true });
    }
  });

  useEffect(() => {
    if (sessionStorage.newAddedPCDID != null) {
      // scroll to element with id of newAddedPCDID
      const el = document.getElementById(sessionStorage.newAddedPCDID);
      if (el) {
        el.scrollIntoView();
      }
      delete sessionStorage.newAddedPCDID;
    }
  });

  useEffect(() => {
    if (!browsingFolder) {
      setSearchParams(undefined);
    } else {
      setSearchParams({
        [FOLDER_QUERY_PARAM]: encodeURIComponent(browsingFolder)
      });
    }
  }, [browsingFolder, setSearchParams]);

  const onFolderClick = useCallback((folder: string) => {
    setBrowsingFolder(folder);
  }, []);

  const isRoot = isRootFolder(browsingFolder);
  const isFrogCrypto = isFrogCryptoFolder(browsingFolder);

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

  if (self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          <LoadingIssuedPCDs />
          {!(foldersInFolder.length === 0 && isRoot) && (
            <FolderExplorerContainer>
              {!isRoot && (
                <FolderDetails
                  noChildFolders={foldersInFolder.length === 0}
                  folder={browsingFolder}
                  onFolderClick={onFolderClick}
                />
              )}
              {foldersInFolder
                .filter(
                  // /FrogCrypto is a special and rendered by <FrogFolder />
                  (folder) => folder !== FrogCryptoFolderName
                )
                .sort((a, b) => a.localeCompare(b))
                .map((folder) => {
                  return (
                    <FolderCard
                      key={folder}
                      onFolderClick={onFolderClick}
                      folder={folder}
                    />
                  );
                })}
              {isRoot && (
                <FrogFolder
                  Container={FolderEntryContainer}
                  onFolderClick={onFolderClick}
                />
              )}
            </FolderExplorerContainer>
          )}

          {isFrogCrypto ? (
            <FrogHomeSection />
          ) : (
            <>
              {!(foldersInFolder.length === 0 && isRoot) && <Separator />}
              {pcdsInFolder.length > 0 ? (
                <PCDCardList pcds={pcdsInFolder} />
              ) : (
                <NoPcdsContainer>This folder has no PCDs</NoPcdsContainer>
              )}
              {pcdsInFolder.length > 0 && !isRoot && (
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

const NoPcdsContainer = styled.div`
  padding: 32;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  color: rgba(255, 255, 255, 0.7);
`;

function FolderDetails({
  folder,
  onFolderClick,
  noChildFolders
}: {
  folder: string;
  onFolderClick: (folder: string) => void;
  noChildFolders: boolean;
}): JSX.Element {
  const onUpOneClick = useCallback(() => {
    onFolderClick(getParentFolder(folder));
  }, [folder, onFolderClick]);

  return (
    <FolderHeader
      onClick={onUpOneClick}
      style={noChildFolders ? { borderBottom: "none" } : undefined}
    >
      <span className="btn">
        <img draggable="false" src={icons.upArrow} width={18} height={18} />
      </span>
      <span className="name">{folder}</span>
    </FolderHeader>
  );
}

function FolderCard({
  folder,
  onFolderClick
}: {
  folder: string;
  onFolderClick: (folder: string) => void;
}): JSX.Element {
  const onClick = useCallback(() => {
    onFolderClick(folder);
  }, [folder, onFolderClick]);

  return (
    <FolderEntryContainer onClick={onClick}>
      <img draggable="false" src={icons.folder} width={18} height={18} />
      {getNameFromPath(folder)}
    </FolderEntryContainer>
  );
}

const FolderExplorerContainer = styled.div`
  border-radius: 12px;
  border: 1px solid grey;
  background: var(--primary-dark);
  overflow: hidden;
  margin: 12px 8px;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: column;
`;

const Separator = styled.div`
  width: 100%;
  height: 1px;
  margin-top: 32px;
  margin-bottom: 32px;
  background-color: grey;
  user-select: none;
`;

const FolderHeader = styled.div`
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex-direction: row;
  border-bottom: 1px solid grey;
  background: var(--bg-dark-gray);
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--bg-lite-gray);
  }

  .name {
    flex-grow: 1;
    padding: 12px 16px;
    border-left: none;
    box-sizing: border-box;
  }

  .btn {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 0;
    display: inline-block;
    padding-top: 16px;
    padding-left: 12px;
  }
`;

const FolderEntryContainer = styled.div`
  user-select: none;
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-direction: row;
  gap: 12px;
  border-bottom: 1px solid grey;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--primary-lite);
  }
`;

const RemoveAllContainer = styled.div`
  padding: 0px 16px 16px 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;
