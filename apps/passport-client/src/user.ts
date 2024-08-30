import { requestLogToServer, requestUser, User } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreIdentityV4PCD,
  SemaphoreIdentityV4PCDTypeName
} from "@pcd/semaphore-identity-v4";
import { appConfig } from "./appConfig";
import { Dispatcher } from "./dispatch";

// Starts polling the user from the server, in the background.
export async function pollUser(
  self: User,
  dispatch: Dispatcher
): Promise<void> {
  try {
    console.log("[USER_POLL] polling user");
    const response = await requestUser(appConfig.zupassServer, self.uuid);
    if (response.error?.userMissing) {
      // this user was previously a valid user, but now the
      // app isn't able to find them, so we should log the
      // user out of this Zupass.
      requestLogToServer(appConfig.zupassServer, "invalid-user", {
        reason: 404
      });
      dispatch({ type: "participant-invalid" });
    }

    if (!response.success) {
      // don't update the state of the app to have an erroneous user.
      console.log(
        "[USER_POLL] error loading user, skipping update",
        response.error
      );
      return;
    }

    await dispatch({ type: "set-self", self: response.value });
  } catch (e) {
    console.error("[USER_POLL] Error polling user", e);
  }
}

// Function that checks whether the user has set a password for their account
export function hasSetupPassword(user: User): boolean {
  return !!user && !!user.salt;
}

export function findUserIdentityV3PCD(
  pcds: PCDCollection,
  user: User
): SemaphoreIdentityPCD | undefined {
  return findIdentityV3PCD(pcds, user.commitment);
}

export function findIdentityV3PCD(
  pcds: PCDCollection,
  v3Commitment: string
): SemaphoreIdentityPCD | undefined {
  for (const pcd of pcds.getPCDsByType(SemaphoreIdentityPCDTypeName)) {
    if (
      (pcd as SemaphoreIdentityPCD).claim.identity.commitment.toString() ===
      v3Commitment
    ) {
      return pcd as SemaphoreIdentityPCD;
    }
  }
  return undefined;
}

export function findUserIdentityV4PCD(
  pcds: PCDCollection,
  user: User
): SemaphoreIdentityV4PCD | undefined {
  return findIdentityV4PCD(pcds, user.semaphore_v4_commitment);
}

export function findIdentityV4PCD(
  pcds: PCDCollection,
  v4Commitment?: string | undefined | null
): SemaphoreIdentityV4PCD | undefined {
  for (const pcd of pcds.getPCDsByType(SemaphoreIdentityV4PCDTypeName)) {
    if (
      (pcd as SemaphoreIdentityV4PCD).claim.identity.commitment.toString() ===
        v4Commitment ||
      v4Commitment === undefined
    ) {
      return pcd as SemaphoreIdentityV4PCD;
    }
  }
  return undefined;
}
