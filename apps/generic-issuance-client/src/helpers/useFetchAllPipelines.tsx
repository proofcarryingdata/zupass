import {
  ZuboxGetAllUserPipelinesResponse,
  requestZuboxGetAllUserPipelines
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchAllPipelines():
  | ZuboxGetAllUserPipelinesResponse
  | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<
    ZuboxGetAllUserPipelinesResponse | undefined
  >();

  useEffect(() => {
    if (!jwt) {
      return;
    }

    requestZuboxGetAllUserPipelines(ZUPASS_SERVER_URL, jwt).then((res) => {
      setResult(res);
    });
  }, [jwt]);

  return result;
}
