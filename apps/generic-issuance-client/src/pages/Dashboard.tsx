import { GenericIssuancePipelineListEntry } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useContext, useState } from "react";
import { PageContent, Table } from "../components/Core";
import { Header } from "../components/Header";
import {
  pipeineLastEdit,
  pipelineCreatedAt,
  pipelineDetailPagePath,
  pipelineIcon,
  pipelineLink,
  pipelineOwner,
  pipelineStatus,
  pipelineType
} from "../components/PipelineListEntry";
import { GIContext } from "../helpers/Context";
import { savePipeline } from "../helpers/Mutations";
import { useFetchAllPipelines } from "../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";

const SAMPLE_CREATE_PIPELINE_TEXT = JSON.stringify(
  {
    type: "Lemonade",
    timeCreated: 0,
    timeUpdated: 0,
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
  const ctx = useContext(GIContext);
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
        console.log("create pipeline result", res);
        if (res.success === false) {
          alert(res.error);
        } else {
          window.location.href = "/#/" + pipelineDetailPagePath(res.value?.id);
        }
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
                <td>owner</td>
                <td>created at</td>
                <td>last edit</td>
                <td>more details</td>
              </tr>
            </thead>
            <tbody>
              {pipelineEntries.map((p, i) => {
                return (
                  <tr key={i}>
                    <td>
                      <span>{pipelineIcon(p?.extraInfo?.lastRun)}</span>
                    </td>
                    <td>
                      <span>{pipelineStatus(p?.extraInfo?.lastRun)}</span>
                    </td>
                    <td>{pipelineType(p)}</td>
                    <td>{pipelineOwner(p)}</td>
                    <td>{pipelineCreatedAt(p.pipeline.timeCreated)}</td>
                    <td>{pipeineLastEdit(p.pipeline.timeUpdated)}</td>
                    <td>{pipelineLink(p.pipeline.id)}</td>
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
