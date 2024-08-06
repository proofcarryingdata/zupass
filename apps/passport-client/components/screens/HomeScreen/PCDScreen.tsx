import { PCD } from "@pcd/pcd-types";
import React, { useMemo } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { NewButton } from "../../NewButton";
import { PCDCard } from "../../shared/PCDCard";

export const PCDScreen = React.memo(PCDScreenImpl);

export function PCDScreenImpl(): JSX.Element | null {
  const pcds = usePCDCollection();
  const id = new URLSearchParams(window.location.hash.split("?")[1]).get("id");
  const pcd: PCD | undefined = useMemo(() => {
    if (!id) return undefined;
    return pcds.getById(id);
  }, [id, pcds]);

  if (!pcd) {
    return <>no pcd with that id found</>;
  }

  return (
    <div className="w-[100vw] h-[100vh] flex flex-col">
      <div className="w-full bg-red-200">
        <NewButton
          className="w-40"
          onClick={() => {
            window.location.href = "/#/other";
          }}
        >
          Back
        </NewButton>
      </div>

      <div className="w-full h-full flex flex-row">
        <div className="w-[50%] bg-red-300 flex items-center justify-center">
          <div className="w-[300px]">
            <PCDCard pcd={pcd} expanded={true} />
          </div>
        </div>
        <div className="w-[50%] bg-red-400"> {id}</div>
      </div>
    </div>
  );
}
