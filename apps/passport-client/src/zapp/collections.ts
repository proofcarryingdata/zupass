import { PCDCollection } from "@pcd/pcd-collection";
import type { POD } from "@pcd/pod";
import { isPODPCD } from "@pcd/pod-pcd";

export const COLLECTIONS_ROOT_FOLDER_NAME = "Collections";

export function collectionIdToFolderName(collectionId: string): string {
  return `${COLLECTIONS_ROOT_FOLDER_NAME}/${collectionId}`;
}

export function getCollectionNames(pcds: PCDCollection): string[] {
  return pcds.getFoldersInFolder(COLLECTIONS_ROOT_FOLDER_NAME);
}

export function getPODsForCollections(
  pcds: PCDCollection,
  collectionIds: string[]
): POD[] {
  return collectionIds
    .flatMap((collectionId) =>
      pcds.getAllPCDsInFolder(collectionIdToFolderName(collectionId))
    )
    .filter(isPODPCD)
    .map((pcd) => pcd.pod);
}
