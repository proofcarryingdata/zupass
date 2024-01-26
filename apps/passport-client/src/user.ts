import { requestLogToServer, requestUser, User } from "@pcd/passport-interface";
import { PCDCollection } from "@pcd/pcd-collection";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDTypeName
} from "@pcd/semaphore-identity-pcd";
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
  return user != null && user.salt != null;
}

export function findUserIdentityPCD(
  pcds: PCDCollection,
  user: User
): SemaphoreIdentityPCD | undefined {
  return findIdentityPCD(pcds, user.commitment);
}

export function findIdentityPCD(
  pcds: PCDCollection,
  identityCommitment: string
): SemaphoreIdentityPCD | undefined {
  for (const pcd of pcds.getPCDsByType(SemaphoreIdentityPCDTypeName)) {
    if (
      (pcd as SemaphoreIdentityPCD).claim.identity.commitment.toString() ===
      identityCommitment
    ) {
      return pcd as SemaphoreIdentityPCD;
    }
  }
  return undefined;
}
