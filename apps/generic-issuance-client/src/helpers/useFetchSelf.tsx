import { ZuboxSelfResult, requestZuboxSelf } from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchSelf(): ZuboxSelfResult | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<ZuboxSelfResult>();

  useEffect(() => {
    if (jwt) {
      requestZuboxSelf(ZUPASS_SERVER_URL, jwt).then((result) => {
        setResult(result);
      });
    }
  }, [jwt]);

  return result;
}
