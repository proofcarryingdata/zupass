import { PCD } from "@pcd/pcd-types";
import React, { useMemo } from "react";
import { usePCDCollection } from "../../../src/appHooks";
import { NewButton } from "../../NewButton";
import { PCDCard } from "../../shared/PCDCard";

export const ZmailPCDScreen = React.memo(ZmailPCDScreenImpl);

export function ZmailPCDScreenImpl(): JSX.Element | null {
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
    <div className="w-[100vw] h-[100vh] flex flex-col bg-[#206b5e] gap-4">
      <div className="inline-block p-4">
        <NewButton
          className="inline-block"
          onClick={() => {
            window.location.href = "/#/zmail";
          }}
        >
          Zmail
        </NewButton>
      </div>
      <div className="w-full h-full flex flex-row">
        <div className="flex-grow p-4">
          <p className="m-2">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
            ever since the 1500s, when an unknown printer took a galley of type
            and scrambled it to make a type specimen book. It has survived not
            only five centuries, but also the leap into electronic typesetting,
            remaining essentially unchanged. It was popularised in the 1960s
            with the release of Letraset sheets containing Lorem Ipsum passages,
            and more recently with desktop publishing software like Aldus
            PageMaker including versions of Lorem Ipsum.
          </p>
          <p className="m-2">
            Contrary to popular belief, Lorem Ipsum is not simply random text.
            It has roots in a piece of classical Latin literature from 45 BC,
            making it over 2000 years old. Richard McClintock, a Latin professor
            at Hampden-Sydney College in Virginia, looked up one of the more
            obscure Latin words, consectetur, from a Lorem Ipsum passage, and
            going through the cites of the word in classical literature,
            discovered the undoubtable source. Lorem Ipsum comes from sections
            1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes
            of Good and Evil) by Cicero, written in 45 BC. This book is a
            treatise on the theory of ethics, very popular during the
            Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit
            amet..", comes from a line in section 1.10.32.
          </p>
        </div>

        <div className="flex flex-col items-center justify-start flex-shrink-0 p-4">
          <div className="w-[300px] min-w-[300px] inline-block">
            <PCDCard pcd={pcd} expanded={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
