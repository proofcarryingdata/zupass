import { getNameFromPath, getParentFolder } from "@pcd/pcd-collection";
import { CSSProperties, useCallback } from "react";
import { FaFolderOpen } from "react-icons/fa6";
import { PiArrowBendLeftUpBold } from "react-icons/pi";
import styled from "styled-components";

export function FolderCard({
  folder,
  onFolderClick,
  style
}: {
  folder: string;
  onFolderClick: (folder: string) => void;
  style?: CSSProperties;
}): JSX.Element {
  const onClick = useCallback(() => {
    onFolderClick(folder);
  }, [folder, onFolderClick]);

  return (
    <FolderEntryContainer style={style} onClick={onClick}>
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

export function FolderDetails({
  folder,
  onFolderClick,
  noChildFolders,
  displayFolder
}: {
  folder: string;
  onFolderClick: (folder: string) => void;
  noChildFolders: boolean;
  displayFolder?: string;
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
        <PiArrowBendLeftUpBold size={18} />
      </span>

      <span className="name">{displayFolder ?? folder}</span>
    </FolderHeader>
  );
}
