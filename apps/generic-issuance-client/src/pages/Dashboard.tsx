import { useStytch, useStytchUser } from "@stytch/react";
import { ReactNode, useState } from "react";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const { user } = useStytchUser();
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('')

  if (!user) {
    window.location.href = "/";
  }

  if (error) {
    return <div>An error occured. {JSON.stringify(error)}</div>
  }

  if (isLoggingOut) {
    return <div>Logging out...</div>;
  }

  return (
    <div>
      <p>
        Congrats - you are now logged in as <b>{user.emails?.[0]?.email}.</b>
      </p>
      <button
        onClick={async (): Promise<void> => {
          setLoggingOut(true);
          try {
            await stytchClient.session.revoke();
          } catch (e) {
            setError(e)
            setLoggingOut(false);
          }
        }}
      >
        Log out
      </button>
    </div>
  );
}
