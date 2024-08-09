import { ReactNode, useEffect, useState } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { PCDCard } from "../../shared/PCDCard";
import { useZmailContext } from "./ZmailContext";

export function ZmailPopover(): ReactNode {
  const ctx = useZmailContext();
  const pcds = usePCDCollection();
  const [containerRef, setContainerRef] = useState<
    HTMLDivElement | undefined
  >();

  useEffect(() => {
    const onMouseMove = (e: MouseEvent): void => {
      if (!containerRef) return;

      containerRef.style.display = "initial";
      containerRef.style.top = e.clientY + 20 + "px";
      containerRef.style.left = e.clientX + 20 + "px";
    };

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [containerRef]);

  if (!ctx.hoveringPCDID) {
    return null;
  }

  const pcd = pcds.getById(ctx.hoveringPCDID);

  if (!pcd) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 z-50">
      <div
        className="w-[300px] absolute"
        style={{ display: "none" }}
        ref={(e) => setContainerRef(e ?? undefined)}
      >
        <PCDCard pcd={pcd} expanded={true} />
      </div>
    </div>
  );
}
