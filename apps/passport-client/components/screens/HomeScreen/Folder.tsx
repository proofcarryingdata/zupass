import { getNameFromPath } from "@pcd/pcd-collection";
import { useCallback } from "react";
import { FaFolderOpen } from "react-icons/fa6";
import styled from "styled-components";

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
      <FaFolderOpen size={18} />
      {getNameFromPath(folder)}
    </FolderEntryContainer>
  );
}

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
  background-color: var(--bg-dark-gray);
  cursor: pointer;
  user-select: none;
  padding-left: 8px;
  padding-right: 8px;
  transition: background-color 100ms;

  &:hover {
    background-color: var(--bg-lite-gray);
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
  padding-left: 24px;

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
