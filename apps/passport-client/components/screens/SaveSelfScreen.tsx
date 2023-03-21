import { ZuParticipant } from "@pcd/passport-interface";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { DispatchContext } from "../../src/dispatch";
import { Spacer } from "../core";

export function SaveSelfScreen() {
  // Parse participant
  const [_, dispatch] = useContext(DispatchContext);
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  const [participant, setParticipant] = useState<ZuParticipant | undefined>();

  useEffect(() => {
    let participant: ZuParticipant | null = null;

    try {
      participant = JSON.parse(params.get("participant"));
      console.log("Saving participant", participant);
      setParticipant(participant);
    } catch (e) {
      if (participant == null) {
        // If saving failed, show an error
        const message =
          "Either your email is not on the list, or you've already created a passport, or ";
        dispatch({ type: "error", error: { title: "Save failed", message } });
      }
    }
  }, []);

  useEffect(() => {
    // Save participant to local storage, then redirect to home screen.
    if (participant) dispatch({ type: "save-self", participant, upload: true });
  }, [participant]);

  return (
    <div>
      <Spacer h={24} />
      <p>Saving...</p>
    </div>
  );
}
