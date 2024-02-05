import {
  GenericIssuanceGetAllUserPipelinesResponse,
  PipelineDefinition,
  requestGenericIssuanceGetAllUserPipelines
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { useCallback, useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { LoadHook, UIError } from "../types";

export function useJWT(): string | undefined {
  return useStytch()?.session?.getTokens()?.session_jwt;
}

export async function fetchAllPipelines(
  jwt: string
): Promise<GenericIssuanceGetAllUserPipelinesResponse> {
  return requestGenericIssuanceGetAllUserPipelines(ZUPASS_SERVER_URL, jwt);
}

export function useFetchAllPipelines(): LoadHook<PipelineDefinition[]> {
  const jwt = useJWT();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<UIError>();
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);

  const load = useCallback(async () => {
    if (!jwt) {
      return;
    }
    setLoading(true);
    const res = await fetchAllPipelines(jwt);
    if (res.success) {
      setPipelines(res.value);
    } else {
      setError({
        message: "An error occurred while fetching user pipelines",
        httpRequestError: res.error
      });
    }
    setLoading(false);
  }, [jwt]);

  useEffect(() => {
    load();
  }, [load]);

  return { isLoading, value: pipelines, error };
}
