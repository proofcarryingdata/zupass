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
    <div className="w-[100vw] h-[100vh] flex flex-col bg-[#206b5e] ">
      <div className="inline-block p-4">
        <NewButton
          className="inline-block"
          onClick={() => {
            window.location.href = "/#/other";
          }}
        >
          Zmail
        </NewButton>
      </div>

      <div className="w-full h-full flex flex-row">
        <div className="w-[25%] flex flex-col items-center justify-start pt-[100px]">
          <div className="w-[300px] inline-block">
            <PCDCard pcd={pcd} expanded={true} />
          </div>
        </div>
        <div className="flex-grow bg-red-400"> {id}</div>
      </div>
    </div>
  );
}
