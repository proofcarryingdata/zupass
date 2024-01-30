import { useStytch, useStytchUser } from "@stytch/react";
import { ReactNode, useEffect, useState } from "react";
import { ZUPASS_SERVER_URL } from "../constants";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const { user } = useStytchUser();
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [userPingMessage, setUserPingMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setUserPingMessage("Pinging server...");
    fetch(new URL("generic-issuance/api/user/ping", ZUPASS_SERVER_URL).href, {
      credentials: "include",
      referrerPolicy: "no-referrer"
    })
      .then((res) => res.json())
      .then((message) => setUserPingMessage(`JWT valid, received ${message}.`))
      .catch((e) => setUserPingMessage(`Error: ${e}`));
  }, []);

  if (!user) {
    window.location.href = "/";
  }

  if (error) {
    return <div>An error occured. {JSON.stringify(error)}</div>;
  }

  if (isLoggingOut) {
    return <div>Logging out...</div>;
  }

  return (
    <div>
      <p>
        Congrats - you are now logged in as <b>{user.emails?.[0]?.email}.</b>
      </p>
      {userPingMessage && <p>{userPingMessage}</p>}
      <button
        onClick={async (): Promise<void> => {
          setLoggingOut(true);
          try {
            await stytchClient.session.revoke();
          } catch (e) {
            setError(e);
            setLoggingOut(false);
          }
        }}
      >
        Log out
      </button>
    </div>
  );
}
