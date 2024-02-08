import { GenericIssuancePipelineListEntry } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useState } from "react";
import { PageContent, Table } from "../components/Core";
import { Header } from "../components/Header";
import {
  pipelineIcon,
  pipelineLink,
  pipelineOwner,
  pipelineStatus,
  pipelineType
} from "../components/PipelineListEntry";
import { savePipeline } from "../helpers/Pipeline";
import { useFetchAllPipelines } from "../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";

const SAMPLE_CREATE_PIPELINE_TEXT = JSON.stringify(
  {
    type: "Lemonade",
    editorUserIds: [],
    options: {
      lemonadeApiKey: "your-lemonade-api-key",
      events: [],
      feedOptions: {
        feedId: "example-feed-id",
        feedDisplayName: "Example Feed",
        feedDescription: "Your description here...",
        feedFolder: "Example Folder"
      }
    }
  },
  null,
  2
);

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const pipelinesFromServer = useFetchAllPipelines();
  const pipelineEntries: GenericIssuancePipelineListEntry[] | undefined =
    pipelinesFromServer?.value;

  const [isCreatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineJSON, setNewPipelineJSON] = useState(
    SAMPLE_CREATE_PIPELINE_TEXT
  );
  const user = useFetchSelf();

  const onCreateClick = useCallback(() => {
    if (userJWT) {
      savePipeline(userJWT, newPipelineJSON).then((res) => {
        console.log("RESULT", res);
        alert();
      });
    }
  }, [newPipelineJSON, userJWT]);

  if (!userJWT) {
    window.location.href = "/";
  }

  return (
    <>
      <Header user={user} stytchClient={stytchClient} />
      <PageContent>
        <h2>{user?.value?.isAdmin ? "" : "My "} Pipelines</h2>
        {!pipelineEntries?.length ? (
          <p>No pipelines right now - go create some!</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <td>🍂</td>
                <td>status</td>
                <td>type</td>
                <td>pipeline</td>
                <td>owner</td>
              </tr>
            </thead>
            <tbody>
              {pipelineEntries.map((p, i) => {
                return (
                  <tr key={i}>
                    <td>
                      <span>{pipelineIcon(p)}</span>
                    </td>
                    <td>
                      <span>{pipelineStatus(p)}</span>
                    </td>
                    <td>{pipelineType(p)}</td>
                    <td>{pipelineLink(p)}</td>
                    <td>{pipelineOwner(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div
          style={{
            marginTop: "16px"
          }}
        >
          <button onClick={(): void => setCreatingPipeline((curr) => !curr)}>
            {isCreatingPipeline ? "Minimize 🔼" : "Create 🔽"}
          </button>
          {isCreatingPipeline && (
            <div
              style={{
                marginTop: "8px"
              }}
            >
              <textarea
                rows={20}
                cols={80}
                value={newPipelineJSON}
                onChange={(e): void => setNewPipelineJSON(e.target.value)}
              />
              <div>
                <button onClick={onCreateClick}>🐒 Create! 🚀</button>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
}
