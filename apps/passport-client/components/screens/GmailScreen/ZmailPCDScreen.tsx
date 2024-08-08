import React, { useEffect, useMemo } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { usePCDCollection, useStateContext } from "../../../src/appHooks";
import { PCDCard } from "../../shared/PCDCard";
import { useZmailContext } from "./ZmailContext";

export const ZmailPCDScreen = React.memo(ZmailPCDScreenImpl);

export function ZmailPCDScreenImpl(): JSX.Element | null {
  const { dispatch } = useStateContext();
  const pcds = usePCDCollection();
  const ctx = useZmailContext();

  const id = ctx.viewingPCDID;
  const { pcd, meta } = useMemo(() => {
    if (!id) return { pcd: undefined, meta: undefined };
    return { pcd: pcds.getById(id), meta: pcds.getMetaById(id) };
  }, [id, pcds]);

  useEffect(() => {
    if (!pcd) return;
    if (meta?.viewed) {
      console.log("already viewed");
    } else {
      dispatch({
        type: "update-pcd-meta",
        pcdId: pcd.id,
        pcdMeta: { viewed: true }
      });
    }
  }, [dispatch, meta?.viewed, pcd, pcds]);

  if (!pcd) {
    return <>no pcd with that id found</>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="min-h-3 bg-gray-300 flex-shrink-0">
        {ctx.viewingPCDID && (
          <>
            <div
              onClick={() => {
                ctx.update({
                  viewingPCDID: undefined
                });
              }}
              className="flex items-center justify-center text-gray-600 hover:bg-gray-400 cursor-pointer m-2 active:bg-gray-500 transition-colors duration-200 active:text-white"
              style={{
                borderRadius: "50%",
                width: "28px",
                minWidth: "28px",
                maxWidth: "28px",
                height: "28px",
                minHeight: "28px",
                maxHeight: "28px"
              }}
            >
              <FaArrowLeft size={12} />
            </div>
          </>
        )}
      </div>
      <div className="w-full text-black flex flex-col flex-grow overflow-y-scroll">
        <div className="w-full h-full flex flex-row">
          <div className="flex-grow p-4">
            <p className="m-2">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been the industry's standard dummy text
              ever since the 1500s, when an unknown printer took a galley of
              type and scrambled it to make a type specimen book. It has
              survived not only five centuries, but also the leap into
              electronic typesetting, remaining essentially unchanged. It was
              popularised in the 1960s with the release of Letraset sheets
              containing Lorem Ipsum passages, and more recently with desktop
              publishing software like Aldus PageMaker including versions of
              Lorem Ipsum.
            </p>
            <p className="m-2">
              Contrary to popular belief, Lorem Ipsum is not simply random text.
              It has roots in a piece of classical Latin literature from 45 BC,
              making it over 2000 years old. Richard McClintock, a Latin
              professor at Hampden-Sydney College in Virginia, looked up one of
              the more obscure Latin words, consectetur, from a Lorem Ipsum
              passage, and going through the cites of the word in classical
              literature, discovered the undoubtable source. Lorem Ipsum comes
              from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et
              Malorum" (The Extremes of Good and Evil) by Cicero, written in 45
              BC. This book is a treatise on the theory of ethics, very popular
              during the Renaissance. The first line of Lorem Ipsum, "Lorem
              ipsum dolor sit amet..", comes from a line in section 1.10.32.
            </p>
          </div>

          <div className="flex flex-col items-center justify-start flex-shrink-0 p-4">
            <div className="w-[300px] min-w-[300px] inline-block">
              <PCDCard pcd={pcd} expanded={true} />
            </div>
          </div>
        </div>
      </div>
      <div className="h-3 bg-gray-300 flex-shrink-0"></div>
    </div>
  );
}
