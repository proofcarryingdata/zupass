import {
  LemonadePipelineDefinition,
  PipelineType,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { useStytch, useStytchUser } from "@stytch/react";
import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useFetchAllPipelines } from "../behaviors/useFetchAllPipelines";
import { Header } from "../components/Header";
import { ZUPASS_SERVER_URL } from "../constants";

const SAMPLE_CREATE_PIPELINE_TEXT = JSON.stringify(
  {
    type: PipelineType.Lemonade,
    editorUserIds: [],
    options: {
      lemonadeApiKey: "your-lemonade-api-key",
      events: [
        {
          externalId: "lemonade-id",
          /**
           * TODO: do not accept edits to this field on backend.
           */
          genericIssuanceEventId: uuid(),
          name: "test-event",
          ticketTiers: [
            {
              externalId: "organizer",
              /**
               * TODO: do not accept edits to this field on backend.
               */
              genericIssuanceProductId: uuid(),
              isSuperUser: true
            },
            {
              externalId: "attendee",
              /**
               * TODO: do not accept edits to this field on backend.
               */
              genericIssuanceProductId: uuid(),
              isSuperUser: true
            }
          ]
        }
      ],
      feedOptions: {
        feedId: "0",
        feedDisplayName: "Hot Pot",
        feedDescription: "hot pot tickets",
        feedFolder: "0xPARC/events"
      }
    }
  } satisfies LemonadePipelineDefinition,
  null,
  2
);

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const { user } = useStytchUser();

  // TODO: After MVP, replace with RTK
  // hooks or a more robust state management.
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [isCreatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineRaw, setNewPipelineRaw] = useState(
    SAMPLE_CREATE_PIPELINE_TEXT
  );
  const [error, setError] = useState("");

  const pipelinesHook = useFetchAllPipelines();

  const createPipeline = async (): Promise<void> => {
    if (!newPipelineRaw) return;
    const res = await requestGenericIssuanceUpsertPipeline(ZUPASS_SERVER_URL, {
      pipeline: JSON.parse(newPipelineRaw),
      jwt: userJWT
    });
    await fetchAllPipelines();
    if (res.success) {
      setCreatingPipeline(false);
    } else {
      // TODO: Better errors
      alert(`An error occurred while creating pipeline: ${res.error}`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
      <Header />

      <p>
        Congrats - you are now logged in as <b>{user.emails?.[0]?.email}.</b>
      </p>
      <button
        onClick={async (): Promise<void> => {
          if (confirm("Are you sure you want to log out?")) {
            setLoggingOut(true);
            try {
              await stytchClient.session.revoke();
            } catch (e) {
              setError(e);
              setLoggingOut(false);
            }
          }
        }}
      >
        Log out
      </button>

      <h2>My Pipelines</h2>
      {!pipelinesHook.length && <p>No pipelines right now - go create some!</p>}
      {!!pipelinesHook.length && (
        <ol>
          {pipelinesHook.map((p) => (
            <Link to={`/pipelines/${p.id}`} key={p.id}>
              <li key={p.id}>
                id: {p.id}, type: {p.type}
              </li>
            </Link>
          ))}
        </ol>
      )}
      <p>
        <button onClick={(): void => setCreatingPipeline((curr) => !curr)}>
          {isCreatingPipeline ? "Minimize 🔼" : "Create new pipeline 🔽"}
        </button>
        {isCreatingPipeline && (
          <div>
            <textarea
              rows={10}
              cols={50}
              value={newPipelineRaw}
              onChange={(e): void => setNewPipelineRaw(e.target.value)}
            />
            <div>
              <button onClick={createPipeline}>Create new pipeline</button>
            </div>
          </div>
        )}
      </p>
    </div>
  );
}
