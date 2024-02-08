import { InfoResult, requestPipelineInfo } from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchPipelineInfo(
  id: string | undefined
): InfoResult | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<InfoResult | undefined>();

  useEffect(() => {
    if (id === undefined || !jwt) {
      return;
    }

    requestPipelineInfo(jwt, ZUPASS_SERVER_URL, id).then((res) => {
      setResult(res);
    });
  }, [id, jwt]);

  return result;
}
