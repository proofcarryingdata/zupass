import { PopupActionResult } from "@pcd/passport-interface/PassportPopup/core";
import { useEffect, useState } from "react";
import { ZuAuthArgs, zuAuth } from "./index";

export function useZuAuth(args: ZuAuthArgs): PopupActionResult | undefined {
  const [result, setResult] = useState<PopupActionResult | undefined>();
  useEffect(() => {
    zuAuth(args).then(setResult);
  }, [args]);

  return result;
}
