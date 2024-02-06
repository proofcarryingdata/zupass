import {
  GenericIssuanceSelfResult,
  requestGenericIssuanceSelf
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";

export function useJWT(): string | undefined {
  const userJWT = useStytch()?.session?.getTokens()?.session_jwt;
  return userJWT;
}

export function useFetchSelf(): GenericIssuanceSelfResult | undefined {
  const jwt = useJWT();
  const [result, setResult] = useState<GenericIssuanceSelfResult>();

  useEffect(() => {
    if (jwt) {
      requestGenericIssuanceSelf(ZUPASS_SERVER_URL, jwt).then((result) => {
        setResult(result);
      });
    }
  }, [jwt]);

  return result;
}
