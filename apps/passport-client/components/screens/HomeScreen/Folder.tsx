import { getNameFromPath, getParentFolder } from "@pcd/pcd-collection";
import { CSSProperties, useCallback } from "react";
import styled from "styled-components";
import { usePCDsInFolder } from "../../../src/appHooks";
import { cn } from "../../../src/util";
import { NewButton } from "../../NewButton";
import { EVENTS } from "./utils";

export function FolderEventInfo({
  folder
}: {
  folder: string;
}): React.ReactNode {
  const event = EVENTS[folder];

  const startDate = event?.start;
  const endDate = event?.end;
  const pcds = usePCDsInFolder(folder, true);

  let dateStr = null;

  if (startDate && endDate) {
    dateStr = `${new Date(startDate).toLocaleDateString()}`;
  }

  if (!event) {
    return null;
  }

  return null;

  return (
    <div className="flex flex-col overflow-hidden w-full rounded-lg shadow border-4 border-green-950 select-none">
      {/* <div
        className="flex w-full h-[200px] "
        style={{
          backgroundImage: `url(${event.image})`,
          backgroundSize: "cover"
        }}
      ></div> */}
      <div className="font-bold text-xl w-full bg-[#206b5e] px-4 py-2 ">
        {getNameFromPath(folder)}
        <span className="text-sm font-normal">
          {" · "}
          {dateStr}
          {" · "}
          {pcds.length} ticket{pcds.length > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

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

  const pcds = usePCDsInFolder(folder, true);

  const startDate = EVENTS[folder]?.start;
  const endDate = EVENTS[folder]?.end;
  const img = EVENTS[folder]?.image;

  let dateStr = null;

  if (startDate && endDate) {
    dateStr = `${new Date(startDate).toLocaleDateString()}`;
  }

  if (folder === "Devcon") {
    return (
      <AnimatedContainer>
        <FolderEntryContainer
          style={style}
          onClick={onClick}
          className={cn(
            "border-4 border-purple-600 h-[150px] relative overflow-hidden",
            "bg-purple-700 py-2 px-4 cursor-pointer hover:bg-purple-600  hover:border-purple-400 hover:border-6 transition-all duration-100",
            "rounded-lg font-bold shadow-lg select-none active:ring-2 active:ring-offset-4 active:ring-white ring-opacity-60 ring-offset-[#19473f]",
            "text-lg"
          )}
        >
          {img && (
            <div
              style={{
                backgroundImage: `url(${img})`,
                backgroundSize: "cover",
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%"
              }}
            ></div>
          )}
          <div
            className="flex-grow p-4"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%"
            }}
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
          </div>
        </FolderEntryContainer>
      </AnimatedContainer>
    );
  }

  return (
    <NewButton
      style={style}
      onClick={onClick}
      className={cn("flex flex-row gap-2")}
    >
      <div className="flex-grow inline-block" style={{ textAlign: "left" }}>
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
      </div>
      {img && (
        <div
          className="w-[100px] rounded-lg overflow-hidden shadow"
          style={{
            backgroundImage: `url(${img})`,
            backgroundSize: "cover"
          }}
        ></div>
      )}
    </NewButton>
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

const AnimatedContainer = styled.div`
  @keyframes bobAndGrow {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    50% {
      transform: translateY(-2.5px) scale(1.01);
    }
  }
  animation: bobAndGrow 1s ease-in-out infinite;
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
    <NewButton className={cn()} onClick={onUpOneClick}>
      Back
    </NewButton>
  );
}
