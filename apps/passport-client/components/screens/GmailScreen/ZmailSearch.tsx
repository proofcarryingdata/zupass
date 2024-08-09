import * as fuzzy from "fuzzy";
import { ReactNode, useEffect, useState } from "react";
import { NewInput } from "../../NewInput";
import { useZmailContext } from "./ZmailContext";
import { isSearchFilterId } from "./ZmailFilter";
import { PCDtoRow } from "./ZmailTable";

export function ZmailSearch(): ReactNode {
  const ctx = useZmailContext();
  const [lastSearchTerm, setLastSearchTerm] = useState(ctx.searchTerm);

  useEffect(() => {
    if (ctx.searchTerm !== lastSearchTerm) {
      setLastSearchTerm(ctx.searchTerm);
    } else {
      return;
    }

    const filters = ctx.filters.filter(
      (filter) => !isSearchFilterId(filter.id)
    );

    if (ctx.searchTerm !== "") {
      filters.push({
        filter: (pcd, pcds) => {
          const row = PCDtoRow(pcds, pcd);
          const name = row?.name;

          if (!name) {
            return false;
          }

          return fuzzy.test(ctx.searchTerm, name);
        },
        id: "s_"
      });
    }

    ctx.update({ filters, viewingPCDID: undefined });
  }, [ctx, ctx.searchTerm, lastSearchTerm]);

  return (
    <NewInput
      className="w-full box-border flex-shrink-0"
      placeholder="Search"
      value={ctx.searchTerm}
      onChange={(e) => {
        const newValue = e.target.value;
        ctx.update({ searchTerm: newValue });
      }}
    />
  );
}
