import {
  usePassportPCD,
  useSemaphorePassportProof,
  requestZuzaluMembershipUrl,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL, requestProofFromPassport } from "../src/util";
import { login } from "../src/api";

/**
 * Login for the user who belongs to the specified semaphore group.
 * Generate a semaphore proof, calls the /login endpoint on the server, and
 * gets a jwt. The jwt can be used to make other requests to the server.
 * @param onLoggedIn a callback function which will be called after the user logged in
 * with the jwt
 */
export function Login({
  onLoggedIn,
}: {
  onLoggedIn: (_: string) => void;
}) {
  const [loggingIn, setLoggingIn] = useState(false);

  const pcdStr = usePassportPCD();
  const { proof, valid, error } = useSemaphorePassportProof(
    SEMAPHORE_GROUP_URL!,
    pcdStr
  )

  useEffect(() =>  {
    if (valid === undefined) return; // verifying

    if (error) {
      // TODO: display error to the user
      console.error("error using semaphore passport proof", error);
      setLoggingIn(false);
      return;
    }

    if (!valid) {
      // TODO: display error to the user
      console.error("proof is invalid");
      setLoggingIn(false);
      return;
    }

    (async () => {
      const res = await login(SEMAPHORE_GROUP_URL!, pcdStr);
      if (!res.ok) {
        // TODO: display error to the user
        const err = await res.text();
        console.error("error login to the server:", err);
        setLoggingIn(false);
        return;
      }
      const token = await res.json();
      return token.accessToken;
    })().then((accessToken) => {
      setLoggingIn(false);
      onLoggedIn(accessToken);
    })
  }, [proof, valid, error, pcdStr, onLoggedIn]);

  return (
    <>
      <button
        onClick={
          () => {
            setLoggingIn(true);
            requestZuzaluMembershipProof();
          }
        }
        disabled={loggingIn}
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
    SEMAPHORE_GROUP_URL!
  );

  requestProofFromPassport(proofUrl);
}
