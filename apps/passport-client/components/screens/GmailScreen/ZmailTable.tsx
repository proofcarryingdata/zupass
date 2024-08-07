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
import { ReactNode, useMemo, useState } from "react";
import { cn } from "../../../src/util";
import { useZmailContext } from "./ZmailContext";

export function ZmailTable(): ReactNode {
  const ctx = useZmailContext();

  const data: ZmailRow[] = useMemo(
    () =>
      ctx.pcds
        .getAll()
        .filter((pcd) => {
          for (const filter of ctx.filters) {
            if (!filter.filter(pcd, ctx.pcds)) {
              return false;
            }
          }
          return true;
        })
        .map((pcd) => PCDtoRow(ctx.pcds, pcd))
        .filter((row) => !!row),
    [ctx.filters, ctx.pcds]
  );

  const [sorting, setSorting] = useState<SortingState>([]); // can set initial sorting state here

  const table = useReactTable<ZmailRow>({
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
    <div className="border-2 border-[#1a574d] w-full rounded overflow-hidden">
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
    </div>
  );
}

interface ZmailRow {
  pcd: PCD;
  name: string | undefined;
  type: string;
  folder: string;
}

export function PCDtoRow(pcds: PCDCollection, pcd: PCD): ZmailRow | undefined {
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

const columnHelper = createColumnHelper<ZmailRow>();
const columns = [
  // columnHelper.display({
  //   header: "controls",
  //   cell: () => (
  //     <div
  //       onClick={(e) => {
  //         e.stopPropagation();
  //         e.preventDefault();
  //       }}
  //       className="flex flex-row content-center items-center"
  //     >
  //       <StarToggle />
  //     </div>
  //   ),
  //   maxSize: 50,
  //   minSize: 0,
  //   size: 20
  // }),
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
