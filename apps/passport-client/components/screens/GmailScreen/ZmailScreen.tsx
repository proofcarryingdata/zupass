import React, { useMemo, useState } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { NewButton } from "../../NewButton";
import { ZmailContext, ZmailScreenContextValue } from "./ZmailContext";
import { ZmailSearch } from "./ZmailSearch";
import { ZmailSidebar } from "./ZmailSidebar";
import { ZmailTable } from "./ZmailTable";

export const ZmailScreen = React.memo(ZmailScreenImpl);

export function ZmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();
  const [ctx, setCtx] = useState<ZmailScreenContextValue>({
    pcds,
    filters: [],
    searchTerm: "",
    update: () => {}
  });
  ctx.update = useMemo(() => {
    return (update: Partial<ZmailScreenContextValue>) => {
      setCtx({ ...ctx, ...update });
    };
  }, [ctx]);

  return (
    <ZmailContext.Provider value={ctx}>
      <div className="bg-[#206b5e] h-[100vh]">
        <div className="flex flex-row p-4 gap-4 w-[200px]">
          <NewButton
            className="flex flex-row items-center justify-center gap-4"
            onClick={() => {
              ctx.update({
                filters: [],
                searchTerm: ""
              });
            }}
          >
            <span>Zmail</span>
          </NewButton>
          <ZmailSearch />
        </div>
        <div className="w-full flex flex-col gap-4">
          <div className="flex flex-row overflow-hidden">
            <div className="max-w-[300px]">
              <ZmailSidebar />
            </div>
            <div className="flex-grow p-2 flex flex-col gap-4">
              <ZmailTable />
            </div>
          </div>
        </div>
      </div>
    </ZmailContext.Provider>
  );
}
