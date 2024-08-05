import { PopupActionResult } from "@pcd/passport-interface/PassportPopup/core";
import { useEffect, useState } from "react";
import { ZuAuthArgs, zuAuthPopup } from "./index.js";

type ZuAuthReactResult = PopupActionResult | { type: "loading" };

/**
 * Simple React effect hook for using ZuAuth for authentication.
 */
export function useZuAuthPopup(args: ZuAuthArgs): ZuAuthReactResult {
  const [result, setResult] = useState<ZuAuthReactResult>({ type: "loading" });
  useEffect(() => {
    zuAuthPopup(args).then(setResult);
  }, [args]);

  return result;
}
