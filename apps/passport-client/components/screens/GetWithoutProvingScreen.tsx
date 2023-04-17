import {
  PCDGetWithoutProvingRequest,
  PCDRequestType,
} from "@pcd/passport-interface";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { err } from "../../src/util";

export function GetWithoutProvingScreen() {
  const location = useLocation();
  const [state, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = JSON.parse(
    params.get("request")
  ) as PCDGetWithoutProvingRequest;

  if (request.type !== PCDRequestType.GetWithoutProving) {
    err(
      dispatch,
      "Unsupported request",
      `Expected a PCD GetWithoutProving request`
    );
    return null;
  }

  return <div>get without proving screen</div>;
}
