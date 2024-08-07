import { PCDCollection } from "@pcd/pcd-collection";
import { PCD } from "@pcd/pcd-types";

export function folderNameToFilterId(folderName: string): string {
  return "f_" + folderName;
}

export function isFolderFilterId(filterId: string): boolean {
  return filterId.startsWith("f_");
}

export function isSearchFilterId(filterId: string): boolean {
  return filterId.startsWith("s_");
}

export interface ZmailFilter {
  filter: (pcd: PCD, pcds: PCDCollection) => boolean;
  id: string;
}
