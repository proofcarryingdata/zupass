import { PopupActionResult } from "@pcd/passport-interface/PassportPopup/core";
import { useEffect, useState } from "react";
import { ZuAuthArgs, zuAuth } from "./index";

/**
 * Simple React effect hook for using ZuAuth for authentication.
 */
export function useZuAuth(args: ZuAuthArgs): PopupActionResult | undefined {
  const [result, setResult] = useState<PopupActionResult | undefined>();
  useEffect(() => {
    zuAuth(args).then(setResult);
  }, [args]);

  return result;
}
