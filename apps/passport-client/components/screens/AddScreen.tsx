import { PCDAddRequest, PCDRequestType } from "@pcd/passport-interface";
import React, { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { err } from "../../src/util";

export function AddScreen() {
  const location = useLocation();
  const [state, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(params.get("request")) as PCDAddRequest;

  if (request.type !== PCDRequestType.Add) {
    err(dispatch, "Unsupported request", `Expected a PCD GET request`);
    return null;
  }

  return (
    <div>
      this is the add screen <br />
      {JSON.stringify(request)}
    </div>
  );
}
