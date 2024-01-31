import { useStytch, useStytchUser } from "@stytch/react";
import axios from "axios";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ZUPASS_SERVER_URL } from "../constants";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const { user } = useStytchUser();
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [userPingMessage, setUserPingMessage] = useState("");
  const [pipelines, setPipelines] = useState([]);
  const [isCreatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineRaw, setNewPipelineRaw] = useState("");
  const [error, setError] = useState("");

  const fetchAllPipelines = useCallback(() => {
    fetch(new URL(`generic-issuance/api/pipelines`, ZUPASS_SERVER_URL).href, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => setPipelines(data))
      .catch((e) => alert(e));
  }, []);

  useEffect(() => {
    setUserPingMessage("Pinging server...");
    fetch(new URL("generic-issuance/api/user/ping", ZUPASS_SERVER_URL).href, {
      credentials: "include"
    })
      .then((res) => res.json())
      .then((message) => setUserPingMessage(`JWT valid, received ${message}.`))
      .catch((e) => setUserPingMessage(`Error: ${e}`));

    fetchAllPipelines();
  }, [fetchAllPipelines]);

  const createPipeline = async (): Promise<void> => {
    if (!newPipelineRaw) return;
    await axios.put(
      new URL("generic-issuance/api/pipelines", ZUPASS_SERVER_URL).href,
      JSON.parse(newPipelineRaw),
      { withCredentials: true }
    );
    await fetchAllPipelines();

    // await fetch(
    //   new URL("generic-issuance/api/pipelines", ZUPASS_SERVER_URL).href,
    //   {
    //     credentials: "include",
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json"
    //       //   Accept: "application/json"
    //     },
    //     body: newPipelineRaw
    //   }
    // )
    //   .then((res) => res.json())
    //   .then((pipelines) => setPipelines(pipelines))
    //   .catch((e) => setUserPingMessage(`Error: ${e}`));

    setCreatingPipeline(false);
  };

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
      <button onClick={(): void => setCreatingPipeline((curr) => !curr)}>
        {isCreatingPipeline ? "Minimize 🔼" : "Create new pipeline 🔽"}
      </button>
      {isCreatingPipeline && (
        <div>
          <textarea
            value={newPipelineRaw}
            onChange={(e): void => setNewPipelineRaw(e.target.value)}
          />
          <div>
            <button onClick={createPipeline}>Create new pipeline</button>
          </div>
        </div>
      )}
      <h2>My Pipelines</h2>
      {!pipelines.length && <div>No pipelines right now - go create some!</div>}
      {!!pipelines.length && (
        <ol>
          {pipelines.map((p) => (
            <Link to={`/pipelines/${p.id}`}>
              <li key={p.id}>
                id: {p.id}, type: {p.type}
              </li>
            </Link>
          ))}
        </ol>
      )}
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
