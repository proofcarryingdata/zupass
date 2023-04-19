import { getHash, passportEncrypt } from "@pcd/passport-crypto";
import { ZuParticipant } from "@pcd/passport-interface";
import { useContext, useEffect } from "react";
import { uploadEncryptedStorage } from "../../src/api/endToEndEncryptionApi";
import { DispatchContext } from "../../src/dispatch";
import { loadEncryptionKey, loadPCDs } from "../../src/localstorage";
import { ZuState } from "../../src/state";

export async function uploadPCDs(participant: ZuParticipant): Promise<void> {
  console.log("uploading pcds");

  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const encryptedStorage = await passportEncrypt(
    JSON.stringify({
      pcds: await pcds.serializeAll(),
      self: participant,
    }),
    encryptionKey
  );

  const blobKey = await getHash(encryptionKey);

  return uploadEncryptedStorage(blobKey, encryptedStorage)
    .then(() => {
      console.log("successfully saved encrypted storage to server");
    })
    .catch((e) => {
      console.log("failed to upload e2ee", e);
    });
}

function trySync(state: ZuState) {
  const lastSyncedIds = localStorage["last-synced-ids"];
  let parsedLastSyncedIds: string[] = [];

  try {
    parsedLastSyncedIds = JSON.parse(lastSyncedIds) as string[];
  } catch (_e) {
    console.log(`[SYNC] failed to parse last synced ids - start from scratch`);
  }

  const lastSync = parsedLastSyncedIds.join(",");
  const pcds = state.pcds.getAll();
  const currentPcdIds = pcds.map((pcd) => pcd.id);
  const currentSync = currentPcdIds.join(",");

  if (lastSync !== currentSync) {
    console.log("[SYNC] diff detected - uploading PCDs");
    uploadPCDs(state.self).then(() => {
      localStorage["last-synced-ids"] = JSON.stringify(currentPcdIds);
    });
  } else {
    console.log("[SYNC] no diff");
  }
}

/**
 * Listens to changes on the state of the application. Whenever there is a change
 * that causes there to be a difference between the current set of PCDs (as identified
 * by the concatenation of their ids) and the set of PCDs that was last uploaded,
 * uploads the current set of PCDs, and saves the fact that we uploaded them.
 */
export function useSyncE2EEStorage() {
  const [state] = useContext(DispatchContext);

  useEffect(() => {
    trySync(state);
  }, [state]);
}
