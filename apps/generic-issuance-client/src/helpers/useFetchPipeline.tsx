import {
  GenericIssuanceGetPipelineResponse,
  requestGenericIssuanceGetPipeline
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchPipeline(
  id: string | undefined
): GenericIssuanceGetPipelineResponse | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<
    GenericIssuanceGetPipelineResponse | undefined
  >();

  useEffect(() => {
    if (!id || !jwt) {
      return;
    }

    requestGenericIssuanceGetPipeline(ZUPASS_SERVER_URL, id, jwt).then(
      (res) => {
        setResult(res);
      }
    );
  }, [id, jwt]);

  return result;
}
