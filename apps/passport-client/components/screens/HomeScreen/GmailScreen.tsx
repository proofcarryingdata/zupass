import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { fuzzy } from "fast-fuzzy";
import React, { Dispatch, ReactNode, useMemo, useState } from "react";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { usePCDCollection } from "../../../src/appHooks";
import { cn } from "../../../src/util";
import { NewInput } from "../../NewInput";

export const GmailScreen = React.memo(GmailScreenImpl);

const StarToggle = ({
  initialState = false,
  onToggle
}: {
  initialState?: boolean;
  onToggle?: (isStarred: boolean) => void;
}): ReactNode => {
  const [isStarred, setIsStarred] = useState(initialState);

  const handleToggle = (): void => {
    const newState = !isStarred;
    setIsStarred(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <button onClick={handleToggle} className="focus:outline-none">
      {isStarred ? (
        <AiFillStar className="text-yellow-400 text-xl" />
      ) : (
        <AiOutlineStar className="text-gray-400 text-xl hover:text-yellow-400" />
      )}
    </button>
  );
};

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.display({
    header: "controls",
    cell: () => (
      <div
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className="flex flex-row content-center items-center"
      >
        <StarToggle />
      </div>
    ),
    maxSize: 50,
    minSize: 0,
    size: 20
  }),
  columnHelper.accessor("folder", {
    header: "folder",
    cell: (info) => info.getValue()
  }),
  columnHelper.accessor("name", {
    header: "name",
    cell: (info) => info.getValue()
  }),
  columnHelper.accessor("pcd.id", {
    header: "id",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    size: 100,
    maxSize: 150
  }),
  columnHelper.accessor("type", {
    header: "type",
    cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    maxSize: 120
  })
];
interface Row {
  pcd: PCD;
  name: string | undefined;
  type: string;
  folder: string;
}

function PCDtoRow(pcds: PCDCollection, pcd: PCD): Row | undefined {
  const pack = pcds.getPackage(pcd.type);

  if (!pack) {
    return undefined;
  }

  if (!pack.getDisplayOptions) {
    return undefined;
  }

  const options = pack.getDisplayOptions(pcd);

  return {
    pcd,
    name: options.header,
    type: pcd.type,
    folder: pcds.getFolderOfPCD(pcd.id) ?? "/"
  };
}

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function GmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();
  const [pcdFilters, setPCDFilters] = useState<PCDFilter[]>([]);

  return (
    <div className="bg-[#206b5e] h-[100vh]">
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-row overflow-hidden">
          <div className="max-w-[300px]">
            <PCDSidebar
              pcds={pcds}
              pcdFilters={pcdFilters}
              setPCDFilters={setPCDFilters}
            />
          </div>
          <div className="flex-grow p-2 flex flex-col gap-4">
            <PCDSearch
              pcds={pcds}
              pcdFilters={pcdFilters}
              setPCDFilters={setPCDFilters}
            />
            <PCDTable
              pcds={pcds}
              pcdFilters={pcdFilters}
              setPCDFilters={setPCDFilters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function folderNameToFilterId(folderName: string): string {
  return "f_" + folderName;
}

function isFolderFilterId(filterId: string): boolean {
  return filterId.startsWith("f_");
}

export function PCDSidebar({
  pcds,
  pcdFilters,
  setPCDFilters
}: {
  pcds: PCDCollection;
  pcdFilters: PCDFilter[];
  setPCDFilters: Dispatch<React.SetStateAction<PCDFilter[]>>;
}): ReactNode {
  const folders = pcds.getAllFolderNames();

  return (
    <div className="w-full h-full p-2 select-none flex flex-col gap-1">
      {folders.map((f) => (
        <div
          onClick={() => {
            setPCDFilters((filters) => {
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
              return [...filters];
            });
          }}
          className={cn(
            "bg-[#206b5e] hover:bg-[#1b8473] active:bg-[#239b87]",
            "cursor-pointer px-2 py-1 rounded transition-colors duration-100",
            pcdFilters.find((filter) => filter.id === folderNameToFilterId(f))
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

export function isSearchFilterId(filterId: string): boolean {
  return filterId.startsWith("s_");
}

export function PCDSearch({
  pcds,
  pcdFilters,
  setPCDFilters
}: {
  pcds: PCDCollection;
  pcdFilters: PCDFilter[];
  setPCDFilters: Dispatch<React.SetStateAction<PCDFilter[]>>;
}): ReactNode {
  const [term, setTerm] = useState("");

  return (
    <div>
      <NewInput
        placeholder="Search"
        value={term}
        onChange={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newValue = e.target.value;

          setPCDFilters((filters) => {
            filters = filters.filter((filter) => !isSearchFilterId(filter.id));

            if (newValue !== "") {
              filters.push({
                filter: (pcd, pcds) => {
                  const row = PCDtoRow(pcds, pcd);
                  const name = row?.name;

                  // eslint-disable-next-line eqeqeq
                  if (name == null) {
                    return false;
                  }

                  const match = fuzzy(newValue, name);
                  return match > 0.5;
                },
                id: "s_"
              });
            }

            return [...filters];
          });

          setTerm(newValue);
        }}
      />
    </div>
  );
}

export type PCDFilter = {
  filter: (pcd: PCD, pcds: PCDCollection) => boolean;
  id: string;
};

export function PCDTable({
  pcds,
  pcdFilters,
  setPCDFilters
}: {
  pcds: PCDCollection;
  pcdFilters: PCDFilter[];
  setPCDFilters: Dispatch<React.SetStateAction<PCDFilter[]>>;
}): ReactNode {
  const data: Row[] = useMemo(
    () =>
      pcds
        .getAll()
        .filter((pcd) => {
          for (const filter of pcdFilters) {
            if (!filter.filter(pcd, pcds)) {
              return false;
            }
          }
          return true;
        })
        .map((pcd) => PCDtoRow(pcds, pcd))
        .filter((row) => !!row),
    [pcdFilters, pcds]
  );

  const [sorting, setSorting] = useState<SortingState>([]); // can set initial sorting state here

  const table = useReactTable<Row>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting
    },
    onSortingChange: setSorting
  });

  return (
    <table className="w-full select-none">
      <thead className="">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th
                onClick={() => {
                  header.column.toggleSorting();
                }}
                className="border-2 border-[#1a574d] cursor-pointer"
                key={header.id}
                style={{
                  width: `${header.getSize()}px`,
                  maxWidth: `${header.column.columnDef.maxSize}px`,
                  minWidth: `${header.column.columnDef.minSize}px`
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className="bg-green-800">
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              "cursor-pointer bg-[#206b5e] hover:bg-[#1b8473] active:bg-[#239b87] border-2 border-[#1a574d] hover:shadow"
            )}
            style={{
              transition: "background-color 100ms",
              borderLeft: "none",
              borderRight: "none"
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                onClick={() => {
                  window.location.href = `/#/pcd?id=${encodeURIComponent(
                    row.original.pcd.id
                  )}`;
                }}
                {...{
                  key: cell.id,
                  style: {
                    width: cell.column.getSize(),
                    maxWidth: `${cell.column.columnDef.maxSize}px`,
                    minWidth: `${cell.column.columnDef.minSize}px`,
                    overflow: "hidden"
                  }
                }}
                className="text-ellipsis whitespace-nowrap px-2 border-2 border-[#1a574d]"
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
