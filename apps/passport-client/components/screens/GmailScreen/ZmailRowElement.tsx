import { Row } from "@tanstack/react-table";
import { ReactNode } from "react";
import { ZmailRow } from "./ZmailTable";

export function ZmailRowElement({ row }: { row: Row<ZmailRow> }): ReactNode {
  return (
    <div className="border-b-2 border-gray-200 px-4 py-[0.1em] cursor-pointer hover:bg-gray-100">
      <span className="font-bold">{row.original.name}</span>
    </div>
  );
}
