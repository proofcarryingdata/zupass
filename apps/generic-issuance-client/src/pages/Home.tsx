import { useStytch, useStytchSession } from "@stytch/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_DURATION_MINUTES, ZUPASS_SERVER_URL } from "../constants";

function Page(): JSX.Element {
  const stytchClient = useStytch();
  const { session } = useStytchSession();
  const [email, setEmail] = useState("");
  const [hasSentEmail, setHasSentEmail] = useState(false);
  const [checkedToken, setCheckedToken] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const navigate = useNavigate();

  // On receiving email code token, try to call Stytch API to authenticate.
  // Sets cookies (session and session JWT) if successful, which redirects
  // to dashboard.
  useEffect(() => {
    if (!token || checkedToken) return;
    stytchClient.magicLinks
      .authenticate(token, {
        session_duration_minutes: SESSION_DURATION_MINUTES
      })
      .then(() => {
        setCheckedToken(true);
      })
      .catch((e) => console.error(e));
  }, [stytchClient, token, checkedToken, navigate]);

  const handleContinue = async (): Promise<void> => {
    if (!email || hasSentEmail) return;
    try {
      await fetch(
        new URL(
          `/generic-issuance/api/user/send-email/${email}`,
          ZUPASS_SERVER_URL
        ),
        { method: "POST" }
      );
      setHasSentEmail(true);
    } catch (e) {
      alert(e);
    }
  };

  if (session) {
    window.location.href = "/#/dashboard";
  }

  if (token) {
    return <div>Attempting to log you in...</div>;
  }

  return (
    <div>
      <h1>Generic Issuance Client</h1>
      {hasSentEmail && (
        <div>
          Please check your email <b>{email}</b> for a login link.
        </div>
      )}
      {!hasSentEmail && (
        <form
          onSubmit={(e): Promise<void> => {
            e.preventDefault();
            e.stopPropagation();
            return handleContinue();
          }}
        >
          <input
            autoFocus
            value={email}
            onChange={(e): void => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
          <button type="submit">Continue</button>
        </form>
      )}
    </div>
  );
}

export default Page;
