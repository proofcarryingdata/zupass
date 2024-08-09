import { Row } from "@tanstack/react-table";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { ReactNode } from "react";
import { cn } from "../../../src/util";
import { useZmailContext } from "./ZmailContext";
import { ZmailRow } from "./ZmailTable";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function ZmailRowElement({ row }: { row: Row<ZmailRow> }): ReactNode {
  const ctx = useZmailContext();
  const meta = row.original.meta;

  return (
    <div
      onClick={() => {
        ctx.update({ viewingPCDID: row.original.pcd.id });
      }}
      className="border-b-2 border-gray-200 px-4 py-[0.1em] cursor-pointer hover:bg-gray-100 select-none flex flex-row items-center justify-between whitespace-nowrap"
    >
      <span className={cn("flex-grow pr-2", meta?.viewed ? "" : "font-bold")}>
        {row.original.name}
      </span>
      <span className="pr-2">
        <span className="italic">{row.original.folder}</span>
        {" · "}
        {row.original.type}
        <span className="w-20 inline-block text-right">
          {meta?.updatedTimestamp
            ? timeAgo.format(new Date(meta.updatedTimestamp), "mini")
            : "n/a"}
        </span>
      </span>
    </div>
  );
}
