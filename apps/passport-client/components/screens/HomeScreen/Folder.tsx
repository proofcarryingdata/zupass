import { getNameFromPath, getParentFolder } from "@pcd/pcd-collection";
import { CSSProperties, useCallback } from "react";
import styled from "styled-components";
import { usePCDsInFolder } from "../../../src/appHooks";
import { cn } from "../../../src/util";
import { EVENT_DATES } from "./utils";

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

  const pcds = usePCDsInFolder(folder);

  const startDate = EVENT_DATES[folder]?.start;
  const endDate = EVENT_DATES[folder]?.end;

  let dateStr = null;

  if (startDate && endDate) {
    dateStr = `${new Date(startDate).toLocaleDateString()}`;
  }

  return (
    <FolderEntryContainer
      style={style}
      onClick={onClick}
      className={cn(
        "bg-green-700 py-2 px-4 cursor-pointer hover:bg-green-600  transition-all duration-100",
        "rounded font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
        "border-none text-lg"
      )}
    >
      {getNameFromPath(folder)}
      <div className="font-normal text-sm">
        {pcds.length} ticket{pcds.length > 1 ? "s" : ""}
        {dateStr && (
          <span>
            {" · "}
            {dateStr}
          </span>
        )}
      </div>
    </FolderEntryContainer>
  );
}

export const FolderExplorerContainer = styled.div`
  /* border-radius: 12px;
  border: 1px solid grey;
  background: var(--primary-dark);
  overflow: hidden;
  margin: 12px 8px;
  box-sizing: border-box;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  flex-direction: column; */
`;

export const FolderHeader = styled.div`
  /* box-sizing: border-box;
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
  } */
`;

export const FolderEntryContainer = styled.div`
  /* user-select: none;
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
  } */
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
      className={cn(
        "bg-green-700 py-2 px-4 cursor-pointer hover:bg-green-600  transition-all duration-100",
        "rounded font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
        "border-none text-lg"
      )}
      onClick={onUpOneClick}
      style={noChildFolders ? { borderBottom: "none" } : undefined}
    >
      Back
    </FolderHeader>
  );
}
