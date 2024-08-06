import { PCD } from "@pcd/pcd-types";
import React, { ReactNode, useMemo } from "react";
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

  let content: ReactNode = null;

  if (!pcd) {
    content = <>no pcd with that id found</>;
  } else {
    content = (
      <>
        {id}
        <div className="w-[300px]">
          <PCDCard pcd={pcd} expanded={true} />
        </div>
      </>
    );
  }

  return (
    <div className="p-8">
      <NewButton
        className="w-40"
        onClick={() => {
          window.location.href = "/#/other";
        }}
      >
        Back
      </NewButton>
      {content}
    </div>
  );
}
