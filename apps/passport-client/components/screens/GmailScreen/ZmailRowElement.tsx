import { Row } from "@tanstack/react-table";
import { ReactNode } from "react";
import { useZmailContext } from "./ZmailContext";
import { ZmailRow } from "./ZmailTable";

export function ZmailRowElement({ row }: { row: Row<ZmailRow> }): ReactNode {
  const ctx = useZmailContext();

  return (
    <div
      onClick={() => {
        ctx.update({ viewingPCDID: row.original.pcd.id });
      }}
      className="border-b-2 border-gray-200 px-4 py-[0.1em] cursor-pointer hover:bg-gray-100 select-none flex flex-row items-center justify-between whitespace-nowrap"
    >
      <span className="font-bold flex-grow">{row.original.name}</span>
      <span className="">
        <span className="italic">{row.original.folder}</span>
        {" · "}
        {row.original.type}
      </span>
    </div>
  );
}
