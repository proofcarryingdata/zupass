import {
  GenericIssuanceGetAllUserPipelinesResponse,
  requestGenericIssuanceGetAllUserPipelines
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchAllPipelines(
  fetchTrigger?: unknown
): GenericIssuanceGetAllUserPipelinesResponse | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<
    GenericIssuanceGetAllUserPipelinesResponse | undefined
  >();

  useEffect(() => {
    if (!jwt) {
      return;
    }

    requestGenericIssuanceGetAllUserPipelines(ZUPASS_SERVER_URL, jwt).then(
      (res) => {
        setResult(res);
      }
    );
  }, [jwt, fetchTrigger]);

  return result;
}
