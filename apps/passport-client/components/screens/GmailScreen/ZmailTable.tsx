import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { ReactNode, useMemo, useState } from "react";
import { useZmailContext } from "./ZmailContext";
import { ZmailRowElement } from "./ZmailRowElement";

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
        .filter((row) => !!row) as ZmailRow[],
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
    <div className="w-full text-black flex flex-col flex-grow overflow-y-scroll">
      {table.getRowModel().rows.map((row) => (
        <ZmailRowElement row={row} />
      ))}
    </div>
  );
}

export interface ZmailRow {
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
  columnHelper.accessor("name", {
    header: "name",
    cell: (info) => info.getValue()
  }),
  columnHelper.accessor("folder", {
    header: "folder",
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
