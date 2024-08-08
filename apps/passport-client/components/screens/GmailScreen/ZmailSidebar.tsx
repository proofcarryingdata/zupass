import { ReactNode, useMemo } from "react";
import { cn } from "../../../src/util";
import { useZmailContext } from "./ZmailContext";
import { folderNameToFilterId, isFolderFilterId } from "./ZmailFilter";
import { ZmailSearch } from "./ZmailSearch";

export function ZmailSidebar(): ReactNode {
  const ctx = useZmailContext();
  const folders = ctx.pcds.getAllFolderNames();
  const sortedFolders = useMemo(() => {
    return folders.sort();
  }, [folders]);

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <ZmailSearch />

      <div className="select-none flex flex-col gap-1 flex-grow overflow-y-scroll">
        {sortedFolders.map((f) => (
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
              ctx.filters.find(
                (filter) => filter.id === folderNameToFilterId(f)
              )
                ? "bg-[#1a574d] hover:[#154940] text-white"
                : ""
            )}
          >
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
