import { PCD } from "@pcd/pcd-types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import React, { useMemo } from "react";
import { usePCDCollection } from "../../../src/appHooks";

export const GmailScreen = React.memo(GmailScreenImpl);

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor("id", {
    cell: (info) => info.getValue()
  })
];

interface Row {
  id: string;
  pcd: PCD;
}

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function GmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection().getAll();
  const rows: Row[] = useMemo(
    () =>
      pcds.map((pcd) => {
        return { pcd, id: pcd.id };
      }),
    [pcds]
  );

  const table = useReactTable<Row>({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="p-2">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
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
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
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
