import {
  GenericIssuanceSelfResult,
  requestGenericIssuanceSelf
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "./userHooks";

export function useFetchSelf(): GenericIssuanceSelfResult | undefined {
  const jwt = useJWT();

  const [result, setResult] = useState<GenericIssuanceSelfResult>();

  useEffect(() => {
    if (jwt) {
      console.log(jwt);
      requestGenericIssuanceSelf(ZUPASS_SERVER_URL, jwt).then((result) => {
        setResult(result);
      });
    }
  }, [jwt]);

  return result;
}
