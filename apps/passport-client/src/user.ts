import { requestLogToServer, requestUser, User } from "@pcd/passport-interface";
import { appConfig } from "./appConfig";
import { Dispatcher } from "./dispatch";

// Starts polling the user from the server, in the background.
export async function pollUser(self: User, jwt: string, dispatch: Dispatcher) {
  try {
    const response = await requestUser(appConfig.zupassServer, self.uuid, jwt);

    if (response.error?.userMissing) {
      // this user was previously a valid user, but now the
      // app isn't able to find them, so we should log the
      // user out of this Zupass.
      requestLogToServer(
        appConfig.zupassServer,
        "invalid-user",
        {
          reason: 404
        },
        jwt
      );
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
