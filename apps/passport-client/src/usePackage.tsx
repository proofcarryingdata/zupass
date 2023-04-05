import { PCD, PCDPackage } from "@pcd/pcd-types";
import { useContext } from "react";
import { DispatchContext } from "./dispatch";

export function usePackage(pcd: PCD): PCDPackage | undefined {
  const [state] = useContext(DispatchContext);
  if (state.pcds.hasPackage(pcd.type)) {
    return state.pcds.getPackage(pcd.type);
  }
  return undefined;
}
