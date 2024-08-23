import { ReactNode, useCallback, useState } from "react";
import { HiLightningBolt } from "react-icons/hi";
import { ZUPASS_URL } from "../main";
import { cn } from "../utils";

export function Navbar({ connecting }: { connecting: boolean }): ReactNode {
  const zupassUrl = localStorage.getItem("zupassUrl") || ZUPASS_URL;

  const [inputZupassUrl, setInputZupassUrl] = useState(zupassUrl);

  const onSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      localStorage.setItem("zupassUrl", inputZupassUrl);
      window.location.reload();
    },
    [inputZupassUrl]
  );

  return (
    <div className="navbar bg-base-100 w-full">
      <div className="flex-none">
        <a className="btn btn-ghost text-lg md:text-xl">Parcnet API Client</a>
      </div>
      <div className="flex-1"></div>
      <div className="flex-none flex items-center">
        <span
          className={cn(
            "mr-1 text-xs md:text-sm",
            connecting
              ? ""
              : "transition-opacity delay-1000 duration-300 opacity-0"
          )}
        >
          {connecting ? "Connecting..." : "Connected!"}
        </span>
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-square btn-ghost rounded-full"
          >
            {" "}
            <HiLightningBolt
              title={
                connecting ? "Connecting to Parcnet..." : "Connected to Parcnet"
              }
              className={cn(
                connecting ? "animate-pulse text-base-500" : "text-green-500"
              )}
            />
          </div>
          <div
            tabIndex={0}
            className="card compact dropdown-content bg-base-200 rounded-box z-[1] w-64 shadow"
          >
            <div tabIndex={0} className="card-body">
              <div className="label">
                <span className="label-text">Set Zupass URL</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs input-sm"
                  value={inputZupassUrl}
                  onChange={(e) => setInputZupassUrl(e.target.value)}
                />
                <button className="btn btn-sm btn-primary" onClick={onSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
