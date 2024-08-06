import React from "react";
import { usePCDCollection } from "../../../src/appHooks";

export const GmailScreen = React.memo(GmailScreenImpl);

/**
 * Show the user their Zupass, an overview of cards / PCDs.
 */
export function GmailScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();

  return (
    <div>
      {Object.entries(pcds.folders).map(([pcdId, folder], i) => (
        <div
          key={i}
          className="max-w-[100%] overflow-hidden whitespace-nowrap text-ellipsis p-1 px-3"
        >
          {folder} - {pcdId}
        </div>
      ))}
    </div>
  );
}
