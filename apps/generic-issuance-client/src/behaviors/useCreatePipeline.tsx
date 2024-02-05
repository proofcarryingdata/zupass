import { requestGenericIssuanceUpsertPipeline } from "@pcd/passport-interface";
import { useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { APIActionHook, UIError } from "../types";
import { useJWT } from "./useFetchAllPipelines";

function f(x: number): number {
  return x + 1;
}

export function useApiActionHook<TArgs, TResult>(
  f: (...args: TArgs) => Promise<TResult>
): APIActionHook<TArgs, TResult> {
  const jwt = useJWT();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<UIError>();

  const load = async ({
    serializedPipeline
  }: {
    serializedPipeline: string;
  }): Promise<void> => {
    if (!serializedPipeline) return;

    setLoading(true);

    return requestGenericIssuanceUpsertPipeline(ZUPASS_SERVER_URL, {
      pipeline: JSON.parse(serializedPipeline),
      jwt
    });
  };

  return {
    load: load,
    isLoading,
    error,
    setError
  };
}
