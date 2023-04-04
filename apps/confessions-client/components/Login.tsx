import {
   requestZuzaluMembershipUrl,
} from "@pcd/passport-interface";
import { useCallback } from "react";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL, requestProofFromPassport } from "../src/util";

export function Login({
  onLoggedIn,
}: {
  onLoggedIn: () => void;
}) {
  return (
    <>
      <button
        onClick={useCallback(
          requestZuzaluMembershipProof, []
        )}
      >
        Login
      </button>
      <br />
      <br />
    </>
  );
}


// Show the Passport popup
// TODO: make the description in the "prove membership" screen
// more relevant to this login case
function requestZuzaluMembershipProof() {
  const proofUrl = requestZuzaluMembershipUrl(
    PASSPORT_URL,
    window.location.origin + "/popup",
    SEMAPHORE_GROUP_URL
  );

  requestProofFromPassport(proofUrl);
}
