import { ZuParticipant } from "@pcd/passport-interface";
import * as React from "react";
import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { Spacer } from "../core";
import { AppContainer } from "../shared/AppContainer";

export function SaveSelfScreen() {
  // Parse participant
  const [state, dispatch] = useContext(DispatchContext);
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    let participant: ZuParticipant | null = null;
    try {
      participant = JSON.parse(params.get("participant"));
    } catch (_) {}

    if (participant && state.identity) {
      // Save participant to local storage, then redirect to home screen.
      dispatch({ type: "save-self", participant });
    } else if (participant) {
      // No saved identity. User clicked magic link on wrong device.
      dispatch({
        type: "error",
        error: {
          title: "Save failed",
          message: "Please verify on the same device you used to sign up.",
        },
      });
    } else {
      dispatch({
        type: "error",
        error: {
          title: "Save failed",
          message: "Missing or unparseable participant",
        },
      });
    }
  }, []);

  return (
    <AppContainer bg="gray">
      <Spacer h={24} />
      <p>Saving...</p>
    </AppContainer>
  );
}
