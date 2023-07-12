import { Identity } from "@semaphore-protocol/identity";
import {
  loadEncryptionKey,
  loadIdentity,
  loadPCDs,
  loadSelf,
  loadUserInvalid,
  saveIdentity,
} from "./localstorage";
import { ZuState } from "./state";

export async function loadInitialState(): Promise<ZuState> {
  let identity = loadIdentity();
  if (identity == null) {
    console.log("Generating a new Semaphore identity...");
    identity = new Identity();
    saveIdentity(identity);
  }

  const self = loadSelf();
  const pcds = await loadPCDs();
  const encryptionKey = await loadEncryptionKey();
  const userInvalid = loadUserInvalid();

  let modal = "" as ZuState["modal"];

  if (userInvalid) {
    modal = "invalid-participant";
  } else if (self != null && !localStorage["savedSyncKey"]) {
    console.log("Asking existing user to save their sync key...");
    modal = "save-sync";
  }

  return {
    self,
    encryptionKey,
    pcds,
    identity,
    modal,
    userInvalid: userInvalid,
  };
}
