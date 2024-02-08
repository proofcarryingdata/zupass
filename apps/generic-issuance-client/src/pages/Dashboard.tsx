import {
  GenericIssuancePipelineListEntry,
  requestGenericIssuanceGetAllUserPipelines,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { PageContent, Table } from "../components/Core";
import { Header } from "../components/Header";
import {
  pipelineIcon,
  pipelineLink,
  pipelineOwner,
  pipelineStatus,
  pipelineType
} from "../components/PipelineListEntry";
import { ZUPASS_SERVER_URL } from "../constants";
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
  const [pipelineEntries, setPipelineEntries] = useState<
    GenericIssuancePipelineListEntry[]
  >([]);
  const [isLoading, setLoading] = useState(true);
  const [isCreatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineRaw, setNewPipelineRaw] = useState(
    SAMPLE_CREATE_PIPELINE_TEXT
  );
  const [error, _setError] = useState("");
  const giUser = useFetchSelf();
  const userJWT = useJWT();

  const fetchAllPipelines = useCallback(async () => {
    if (!userJWT) {
      return;
    }

    setLoading(true);
    const res = await requestGenericIssuanceGetAllUserPipelines(
      ZUPASS_SERVER_URL,
      userJWT ?? ""
    );
    if (res.success) {
      setPipelineEntries(res.value);
    } else {
      // TODO: Better errors
      alert(`An error occurred while fetching user pipelines: ${res.error}`);
    }
    setLoading(false);
  }, [userJWT]);

  const createPipeline = async (): Promise<void> => {
    if (!newPipelineRaw) return;
    const res = await requestGenericIssuanceUpsertPipeline(ZUPASS_SERVER_URL, {
      pipeline: JSON.parse(newPipelineRaw),
      jwt: userJWT ?? ""
    });
    await fetchAllPipelines();
    if (res.success) {
      setCreatingPipeline(false);
    } else {
      // TODO: Better errors
      alert(`An error occurred while creating pipeline: ${res.error}`);
    }
  };

  useEffect(() => {
    fetchAllPipelines();
  }, [fetchAllPipelines]);

  if (!userJWT) {
    window.location.href = "/";
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <PageContent>Loading...</PageContent>
      </>
    );
  }

  if (error) {
    return <div>An error occured. {JSON.stringify(error)}</div>;
  }

  return (
    <>
      <Header />
      <PageContent>
        <h2>{giUser?.value?.isAdmin ? "" : "My "} Pipelines</h2>
        {pipelineEntries.length === 0 ? (
          <p>No pipelines right now - go create some!</p>
        ) : (
          <Table>
            <thead>
              <tr>
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
                    <td
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px"
                      }}
                    >
                      <span>{pipelineIcon(p)}</span>
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
      </PageContent>
    </>
  );
}
