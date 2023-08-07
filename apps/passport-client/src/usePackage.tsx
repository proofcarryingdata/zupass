import { PCD, PCDPackage } from "@pcd/pcd-types";
import { usePCDCollection } from "./appHooks";

/**
 * Given a PCD, returns its corresponding package, or undefined if there
 * is no corresponding package.
 */
export function usePackage(pcd: PCD): PCDPackage | undefined {
  const pcds = usePCDCollection();
  return pcds.getPackage(pcd.type);
}
