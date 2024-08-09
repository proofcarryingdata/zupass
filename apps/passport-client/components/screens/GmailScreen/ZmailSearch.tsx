import * as fuzzy from "fuzzy";
import { ReactNode } from "react";
import { NewInput } from "../../NewInput";
import { useZmailContext } from "./ZmailContext";
import { isSearchFilterId } from "./ZmailFilter";
import { PCDtoRow } from "./ZmailTable";

export function ZmailSearch(): ReactNode {
  const ctx = useZmailContext();

  return (
    <NewInput
      className="w-full box-border flex-shrink-0"
      placeholder="Search"
      value={ctx.searchTerm}
      onChange={(e) => {
        const newValue = e.target.value;

        const filters = ctx.filters.filter(
          (filter) => !isSearchFilterId(filter.id)
        );

        if (newValue !== "") {
          filters.push({
            filter: (pcd, pcds) => {
              const row = PCDtoRow(pcds, pcd);
              const name = row?.name;

              if (!name) {
                return false;
              }

              return fuzzy.test(newValue, name);
            },
            id: "s_"
          });
        }

        ctx.update({ filters, searchTerm: newValue, viewingPCDID: undefined });
      }}
    />
  );
}
