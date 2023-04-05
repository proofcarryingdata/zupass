import {
  PCDAddRequest,
  PCDProveAndAddRequest,
  PCDRequest,
  PCDRequestType,
} from "@pcd/passport-interface";
import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { err } from "../../../src/util";
import { JustAddScreen } from "./JustAddScreen";
import { ProveAndAddScreen } from "./ProveAndAddScreen";

export function AddScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDRequest;

  if (request.type === PCDRequestType.ProveAndAdd) {
    return <ProveAndAddScreen request={request as PCDProveAndAddRequest} />;
  }

  if (request.type === PCDRequestType.Add) {
    return <JustAddScreen request={request as PCDAddRequest} />;
  }

  err(dispatch, "Unsupported request", `Expected a PCD ADD request`);
  return null;
}
