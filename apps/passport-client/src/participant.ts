import { ZuParticipant } from "@pcd/passport-interface";
import { config } from "./config";
import { Dispatcher } from "./dispatch";

// Starts polling the participant record, in the background.
export async function pollParticipant(
  self: ZuParticipant,
  dispatch: Dispatcher
) {
  const url = `${config.passportServer}/zuzalu/participant/${self.uuid}`;
  console.log(`Polling ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // TODO: show as "MISSING" or maybe "REMOVED"?
      console.log("Participant not found, skipping update");
      return;
    }
    const participant = await response.json();
    dispatch({ type: "set-self", self: participant });
  } catch (e) {
    console.error("Error polling participant", e);
  }
}
