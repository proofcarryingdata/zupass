import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import React, { useMemo } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { cn } from "../../../src/util";

export const GmailScreen = React.memo(GmailScreenImpl);

const columnHelper = createColumnHelper<Row>();

const columns = [
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
  const data: Row[] = useMemo(
    () =>
      pcds
        .getAll()
        .map((pcd) => PCDtoRow(pcds, pcd))
        .filter((row) => !!row),
    [pcds]
  );

  const table = useReactTable<Row>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="bg-[#206b5e] w-full h-[100vh]">
      <table className="w-full select-none">
        <thead className="">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  onClick={() => {
                    table.setSorting(() => [{ id: header.id, desc: true }]);
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

  // return (
  //   <div>
  //     {Object.entries(pcds.folders).map(([pcdId, folder], i) => (
  //       <div
  //         key={i}
  //         className="max-w-[100%] overflow-hidden whitespace-nowrap text-ellipsis p-1 px-3"
  //       >
  //         {folder} - {pcdId}
  //       </div>
  //     ))}
  //   </div>
  // );
}

/////////////////////////////
