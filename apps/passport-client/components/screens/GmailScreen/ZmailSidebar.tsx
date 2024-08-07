import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { icons } from "../../icons";
import { NewButton } from "../../NewButton";
import { useZmailContext } from "./ZmailContext";
import { folderNameToFilterId, isFolderFilterId } from "./ZmailFilter";

export function ZmailSidebar(): ReactNode {
  const ctx = useZmailContext();
  const folders = ctx.pcds.getAllFolderNames();

  return (
    <div className="w-full h-full p-2 select-none flex flex-col gap-1">
      <NewButton
        className="flex flex-row items-center justify-center gap-2"
        onClick={() => {
          ctx.update({
            filters: [],
            searchTerm: ""
          });
        }}
      >
        <img draggable="false" src={icons.logo} width="50px" height="25px" />
        <span>Zupass</span>
      </NewButton>
      <span className="underline">folders</span>
      {folders.map((f) => (
        <div
          onClick={() => {
            let filters = ctx.filters;
            if (
              filters.find((filter) => filter.id === folderNameToFilterId(f))
            ) {
              filters = filters.filter(
                (filter) => filter.id !== folderNameToFilterId(f)
              );
            } else {
              filters = filters.filter((f) => !isFolderFilterId(f.id));
              filters.push({
                filter: (pcd, pcds) => {
                  return pcds.getFolderOfPCD(pcd.id) === f;
                },
                id: folderNameToFilterId(f)
              });
            }
            ctx.update({ filters });
          }}
          className={cn(
            "bg-[#206b5e] hover:bg-[#1b8473] active:bg-[#239b87]",
            "cursor-pointer px-2 py-1 rounded transition-colors duration-100",
            ctx.filters.find((filter) => filter.id === folderNameToFilterId(f))
              ? "bg-red-500 hover:bg-red-600"
              : ""
          )}
        >
          {f}
        </div>
      ))}
    </div>
  );
}
