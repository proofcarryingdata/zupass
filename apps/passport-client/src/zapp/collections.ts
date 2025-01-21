import { PCDCollection } from "@pcd/pcd-collection";
import { POD } from "@pcd/pod";
import { PODEmailPCD, isPODEmailPCD } from "@pcd/pod-email-pcd";
import { isPODPCD } from "@pcd/pod-pcd";
import { PODTicketPCD, isPODTicketPCD, ticketToPOD } from "@pcd/pod-ticket-pcd";

export const COLLECTIONS_ROOT_FOLDER_NAME = "Collections";

export function collectionIdToFolderName(collectionId: string): string {
  return `${COLLECTIONS_ROOT_FOLDER_NAME}/${collectionId}`;
}

export function getCollectionNames(pcds: PCDCollection): string[] {
  return pcds.getFoldersInFolder(COLLECTIONS_ROOT_FOLDER_NAME);
}

function emailPCDToPOD(pcd: PODEmailPCD): POD {
  return POD.load(
    pcd.claim.podEntries,
    pcd.proof.signature,
    pcd.claim.signerPublicKey
  );
}

export function getPODsForCollections(
  pcds: PCDCollection,
  collectionIds: string[]
): POD[] {
  return collectionIds
    .flatMap((collectionId) =>
      collectionId === "Devcon SEA"
        ? pcds.getAllPCDsInFolder("Devcon SEA")
        : collectionId === "Email"
        ? pcds.getAllPCDsInFolder("Email")
        : pcds.getAllPCDsInFolder(collectionIdToFolderName(collectionId))
    )
    .filter((pcd) => isPODPCD(pcd) || isPODTicketPCD(pcd) || isPODEmailPCD(pcd))
    .map((pcd) =>
      isPODPCD(pcd)
        ? pcd.pod
        : isPODTicketPCD(pcd)
        ? ticketToPOD(pcd as PODTicketPCD)
        : emailPCDToPOD(pcd as PODEmailPCD)
    );
}
