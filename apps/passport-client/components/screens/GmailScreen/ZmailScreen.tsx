import React, { useEffect, useMemo, useState } from "react";
import { FaCog } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch, usePCDCollection, useSelf } from "../../../src/appHooks";
import { MaybeModal } from "../../modals/Modal";
import { NewButton } from "../../NewButton";
import { ZupassTitle } from "../HomeScreen/HomeScreen";
import { useRunDemo } from "./useRunDemo";
import { ZmailContext, ZmailScreenContextValue } from "./ZmailContext";
import { ZmailPCDScreenImpl } from "./ZmailPCDScreen";
import { ZmailPopover } from "./ZmailPopover";
import { ZmailSidebar } from "./ZmailSidebar";
import { ZmailTable } from "./ZmailTable";

export const ZmailScreen = React.memo(ZmailScreenImpl);

export function ZmailScreenImpl(): JSX.Element | null {
  const dispatch = useDispatch();
  const pcds = usePCDCollection();
  const navigate = useNavigate();
  const self = useSelf();
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

  useEffect(() => {
    if (!self) {
      console.log("Redirecting to login screen");
      navigate("/login", { replace: true });
    }
  });

  const runDemo = useRunDemo();

  return (
    <ZmailContext.Provider value={ctx}>
      <MaybeModal />
      <div className="h-[100vh] max-h-[100vh] overflow-hidden flex flex-col">
        {/* header */}
        <div className="flex flex-row justify-between px-4 pt-4">
          <ZupassTitle
            className="w-[300px] box-border px-4"
            style={{ fontSize: "2.5em", lineHeight: "1.5em" }}
          >
            <span
              className="cursor-pointer transition-colors duration-100 hover:bg-[rgba(0,0,0,0.1)] rounded-lg px-2 py-1 active:bg-[rgba(0,0,0,0.3)] select-none"
              onClick={() => {
                ctx.update({
                  filters: [],
                  searchTerm: "",
                  viewingPCDID: undefined
                });
              }}
            >
              Zmail
            </span>
          </ZupassTitle>

          <div className="flex flex-row gap-2">
            <NewButton
              className="inline-block"
              onClick={() => {
                window.location.href = "/#/";
              }}
            >
              Back to Zupass
            </NewButton>
            <NewButton
              className="flex flex-row justify-center items-center flex-grow text-center flex-shrink"
              onClick={() =>
                dispatch({
                  type: "set-modal",
                  modal: {
                    modalType: "settings"
                  }
                })
              }
            >
              <FaCog size={24} />
            </NewButton>
          </div>
        </div>

        {/* content */}
        <div className="flex flex-row flex-grow overflow-hidden">
          <div className="w-[300px] flex-shrink-0 box-border h-full">
            <ZmailSidebar />
          </div>
          <div className="flex-grow flex flex-col gap-4 p-4 pl-0 h-full">
            <div className="h-full bg-white overflow-hidden rounded-lg flex flex-col">
              {ctx.viewingPCDID ? <ZmailPCDScreenImpl /> : <ZmailTable />}
            </div>
          </div>
        </div>
      </div>
      <ZmailPopover />
      <div
        onClick={runDemo}
        className="absolute bottom-0 left-0 text-transparent hover:bg-red-500 cursor-pointer hover:text-black p-2"
      >
        run demo
      </div>
    </ZmailContext.Provider>
  );
}
