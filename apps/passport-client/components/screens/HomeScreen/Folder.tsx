import { icons } from "@pcd/passport-ui";
import { getNameFromPath } from "@pcd/pcd-collection";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Button } from "../../core";

export function FolderCard({
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

export function FolderLink({ folder }: { folder: string }): JSX.Element {
  const navigate = useNavigate();
  const goToFolder = useCallback(() => {
    navigate(`/?folder=${encodeURIComponent(folder)}`);
  }, [folder, navigate]);
  return (
    <FolderButton>
      <Button onClick={goToFolder}>{folder}</Button>
    </FolderButton>
  );
}

const FolderButton = styled.div`
  margin: 16px 0px;
`;

export const FolderExplorerContainer = styled.div`
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

export const FolderHeader = styled.div`
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

export const FolderEntryContainer = styled.div`
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
