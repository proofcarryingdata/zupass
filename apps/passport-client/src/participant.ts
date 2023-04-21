import { ZuParticipant } from "@pcd/passport-interface";
import { config } from "./config";
import { Dispatcher } from "./dispatch";

// Starts polling the participant record, in the background.
export async function pollParticipant(
  self: ZuParticipant,
  dispatch: Dispatcher
) {
  const url = `${config.passportServer}/zuzalu/participant/${self.uuid}`;
  console.log(`[USER_POLL] Polling ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        // this participant was previously a valid participant, but now the
        // app isn't able to find them, so we should log the user out of this passport.
        dispatch({ type: "participant-invalid" });
      }
      console.log("[USER_POLL] Participant not found, skipping update");
      return;
    }

    const participant = await response.json();

    try {
      await dispatch({ type: "set-self", self: participant });
    } catch (e: any) {
      console.log("failed to set self");
      if (typeof e.message === "string") {
        const msgString: string = e.message;
        if (msgString.includes("mismatch")) {
          dispatch({ type: "participant-invalid" });
        }
      }
    }
  } catch (e) {
    console.error("[USER_POLL] Error polling participant", e);
  }
}
