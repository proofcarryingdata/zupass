import { PCDCollection, PCDMetadata } from "@pcd/pcd-collection";
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

  const data: ZmailRow[] = useMemo(() => {
    const list = ctx.pcds
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
      .filter((row) => !!row) as ZmailRow[];

    list.sort((a, b) => {
      if (a.meta?.updatedTimestamp && b.meta?.updatedTimestamp) {
        return (
          new Date(b.meta.updatedTimestamp).getTime() -
          new Date(a.meta.updatedTimestamp).getTime()
        );
      }
      if (a.meta?.updatedTimestamp) return -1;
      if (b.meta?.updatedTimestamp) return 1;
      return 0;
    });
    return list;
  }, [ctx.filters, ctx.pcds]);

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
    <div className="h-full flex flex-col">
      <div className="min-h-3 bg-gray-300 flex-shrink-0 text-black">
        <div className="m-2 mx-4">
          {ctx.filters.length > 0 && (
            <>
              {data.length} matching POD{data.length > 1 ? "s" : ""}
            </>
          )}
        </div>
      </div>

      <div className="w-full text-black flex flex-col flex-grow overflow-y-scroll">
        {table.getRowModel().rows.map((row) => (
          <ZmailRowElement key={row.id} row={row} />
        ))}
      </div>
      <div className="h-3 bg-gray-300 flex-shrink-0"></div>
    </div>
  );
}

export interface ZmailRow {
  pcd: PCD;
  name: string | undefined;
  type: string;
  folder: string;
  meta?: PCDMetadata;
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
    folder: pcds.getFolderOfPCD(pcd.id) ?? "/",
    meta: pcds.getMetaById(pcd.id)
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
