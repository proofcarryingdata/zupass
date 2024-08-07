import React, { useMemo, useState } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { ZmailContext, ZmailScreenContextValue } from "./ZmailContext";
import { ZmailSearch } from "./ZmailSearch";
import { ZmailSidebar } from "./ZmailSidebar";
import { ZmailTable } from "./ZmailTable";

export const ZmailScreen = React.memo(ZmailScreenImpl);

export function ZmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();
  const [contextValue, setContextValue] = useState<ZmailScreenContextValue>({
    pcds,
    filters: [],
    searchTerm: "",
    update: () => {}
  });
  contextValue.update = useMemo(() => {
    return (update: Partial<ZmailScreenContextValue>) => {
      setContextValue({ ...contextValue, ...update });
    };
  }, [contextValue]);

  return (
    <ZmailContext.Provider value={contextValue}>
      <div className="bg-[#206b5e] h-[100vh]">
        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-row overflow-hidden">
            <div className="max-w-[300px]">
              <ZmailSidebar />
            </div>
            <div className="flex-grow p-2 flex flex-col gap-4">
              <ZmailSearch />
              <ZmailTable />
            </div>
          </div>
        </div>
      </div>
    </ZmailContext.Provider>
  );
}
