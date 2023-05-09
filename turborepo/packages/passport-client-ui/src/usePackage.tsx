import { PCD, PCDPackage } from "@pcd/pcd-types";
import { useContext } from "react";
import { DispatchContext } from "./dispatch";

/**
 * Given a PCD, returns its corresponding package, or undefined if there
 * is no corresponding package.
 */
export function usePackage(pcd: PCD): PCDPackage | undefined {
  const [state] = useContext(DispatchContext);
  return state.pcds.getPackage(pcd.type);
}
