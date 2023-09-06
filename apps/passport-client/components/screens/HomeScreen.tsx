import {
  getNameFromPath,
  getParentFolder,
  isRootFolder
} from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDTypeName } from "@pcd/semaphore-identity-pcd";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useFolders, usePCDsInFolder, useSelf } from "../../src/appHooks";
import {
  clearAllPendingRequests,
  getPendingAddRequest,
  getPendingGetWithoutProvingRequest,
  getPendingHaloRequest,
  getPendingProofRequest
} from "../../src/sessionStorage";
import { useSyncE2EEStorage } from "../../src/useSyncE2EEStorage";
import { Placeholder, Spacer } from "../core";
import { icons } from "../icons";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { AppHeader } from "../shared/AppHeader";
import { LoadingIssuedPCDs } from "../shared/LoadingIssuedPCDs";
import { PCDCard } from "../shared/PCDCard";

export const HomeScreen = React.memo(HomeScreenImpl);

/**
 * Show the user their passport, an overview of cards / PCDs.
 */
export function HomeScreenImpl() {
  useSyncE2EEStorage();
  const self = useSelf();
  const navigate = useNavigate();

  const [browsingFolder, setBrowsingFolder] = useState("/");
  const pcdsInFolder = usePCDsInFolder(browsingFolder);
  const foldersInFolder = useFolders(browsingFolder);

  useEffect(() => {
    if (self == null) {
      console.log("Redirecting to login screen");
      navigate("/login", { replace: true });
    } else if (getPendingProofRequest() != null) {
      console.log("Redirecting to prove screen");
      const encReq = encodeURIComponent(getPendingProofRequest());
      clearAllPendingRequests();
      navigate("/prove?request=" + encReq, { replace: true });
    } else if (getPendingAddRequest() != null) {
      console.log("Redirecting to add screen");
      const encReq = encodeURIComponent(getPendingAddRequest());
      clearAllPendingRequests();
      navigate("/add?request=" + encReq, { replace: true });
    } else if (getPendingHaloRequest() != null) {
      console.log("Redirecting to halo screen");
      clearAllPendingRequests();
      navigate(`/halo${getPendingHaloRequest()}`, { replace: true });
    } else if (getPendingGetWithoutProvingRequest() != null) {
      console.log("Redirecting to get without proving screen");
      const encReq = encodeURIComponent(getPendingGetWithoutProvingRequest());
      clearAllPendingRequests();
      navigate(`/get-without-proving?request=${encReq}`, { replace: true });
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

  const mainPCDId = useMemo(() => {
    if (pcdsInFolder[0]?.type === SemaphoreIdentityPCDTypeName) {
      return pcdsInFolder[0]?.id;
    }
  }, [pcdsInFolder]);
  const [selectedPCDID, setSelectedPCDID] = useState("");
  const selectedPCD = useMemo(() => {
    let selected;

    // if user just added a PCD, highlight that one
    if (sessionStorage.newAddedPCDID != null) {
      selected = pcdsInFolder.find(
        (pcd) => pcd.id === sessionStorage.newAddedPCDID
      );
    } else {
      selected = pcdsInFolder.find((pcd) => pcd.id === selectedPCDID);
    }

    // default to first PCD if no selected PCD found
    if (selected === undefined) {
      selected = pcdsInFolder[0];
    }

    return selected;
  }, [pcdsInFolder, selectedPCDID]);

  const onPcdClick = useCallback((id: string) => {
    setSelectedPCDID(id);
  }, []);

  const onFolderClick = useCallback((folder: string) => {
    setBrowsingFolder(folder);
  }, []);

  const isRoot = isRootFolder(browsingFolder);

  if (self == null) return null;

  return (
    <>
      <MaybeModal />
      <AppContainer bg="gray">
        <Spacer h={24} />
        <AppHeader />
        <Spacer h={24} />
        <Placeholder minH={540}>
          {!(foldersInFolder.length === 0 && isRoot) && (
            <FolderExplorerContainer>
              {!isRoot && (
                <FolderDetails
                  noChildFolders={foldersInFolder.length === 0}
                  folder={browsingFolder}
                  onFolderClick={onFolderClick}
                />
              )}
              {foldersInFolder.map((folder) => {
                return (
                  <FolderCard
                    key={folder}
                    onFolderClick={onFolderClick}
                    folder={folder}
                  />
                );
              })}
            </FolderExplorerContainer>
          )}
          {!(foldersInFolder.length === 0 && isRoot) && <Separator />}
          {pcdsInFolder.length > 0 ? (
            pcdsInFolder.map((pcd) => (
              <WrappedPCDCard
                key={pcd.id}
                pcd={pcd}
                mainIdPCD={mainPCDId}
                onPcdClick={onPcdClick}
                expanded={pcd.id === selectedPCD?.id}
              />
            ))
          ) : (
            <NoPcdsContainer>This folder has no PCDs</NoPcdsContainer>
          )}
          <LoadingIssuedPCDs />
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
}) {
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
}) {
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

const WrappedPCDCard = React.memo(WrappedPCDCardImpl);

function WrappedPCDCardImpl({
  pcd,
  expanded,
  mainIdPCD,
  onPcdClick
}: {
  pcd: PCD;
  expanded: boolean;
  mainIdPCD: string;
  onPcdClick?: (id: string) => void;
}) {
  return (
    <PCDContainer key={"container-" + pcd.id}>
      <PCDCard
        key={"card-" + pcd.id}
        pcd={pcd}
        expanded={expanded}
        isMainIdentity={pcd.id === mainIdPCD}
        onClick={onPcdClick}
      />
    </PCDContainer>
  );
}

const PCDContainer = styled.div`
  margin-top: 8px;
`;
