import {
  PCDAddRequest,
  PCDProveAndAddRequest,
  PCDRequestType,
} from "@pcd/passport-interface";
import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../../src/dispatch";
import { validateRequest } from "../../../src/passportRequest";
import { err } from "../../../src/util";
import { JustAddScreen } from "./JustAddScreen";
import { ProveAndAddScreen } from "./ProveAndAddScreen";

/**
 * Asks user if they want to add the given PCD to their passport. The
 * PCD can either be a `SerializedPCD` passed in via a url, or one that
 * is freshly generated in-passport via a proving screen.
 */
export function AddScreen() {
  const location = useLocation();
  const [_, dispatch] = useContext(DispatchContext);
  const params = new URLSearchParams(location.search);
  const request = validateRequest(params);

  if (request.type === PCDRequestType.ProveAndAdd) {
    return <ProveAndAddScreen request={request as PCDProveAndAddRequest} />;
  }

  if (request.type === PCDRequestType.Add) {
    return <JustAddScreen request={request as PCDAddRequest} />;
  }

  err(dispatch, "Unsupported request", `Expected a PCD ADD request`);
  return null;
}
