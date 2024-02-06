import {
  PipelineDefinition,
  requestGenericIssuanceGetAllUserPipelines,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { useStytchUser } from "@stytch/react";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { PipelineListEntry } from "../components/PipelineListEntry";
import { ZUPASS_SERVER_URL } from "../constants";
import { useFetchSelf, useJWT } from "../helpers/useFetchSelf";
import { AdminPipelinesSection } from "../sections/AdminPipelinesSection";

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
  const { user } = useStytchUser();
  // TODO: After MVP, replace with RTK hooks or a more robust state management.
  const [pipelines, setPipelines] = useState<PipelineDefinition[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isCreatingPipeline, setCreatingPipeline] = useState(false);
  const [newPipelineRaw, setNewPipelineRaw] = useState(
    SAMPLE_CREATE_PIPELINE_TEXT
  );
  const [error, setError] = useState("");
  const giUser = useFetchSelf();
  const userJWT = useJWT();

  const fetchAllPipelines = useCallback(async () => {
    setLoading(true);
    const res = await requestGenericIssuanceGetAllUserPipelines(
      ZUPASS_SERVER_URL,
      userJWT ?? ""
    );
    if (res.success) {
      setPipelines(res.value);
    } else {
      // TODO: Better errors
      alert(`An error occurred while fetching user pipelines: ${res.error}`);
    }
    setLoading(false);
  }, [userJWT]);

  useEffect(() => {
    fetchAllPipelines();
  }, [fetchAllPipelines]);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    window.location.href = "/";
  }

  if (error) {
    return <div>An error occured. {JSON.stringify(error)}</div>;
  }

  return (
    <>
      <Header />
      <PageContent>
        <h2>New Pipeline</h2>
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
        <h2>My Pipelines</h2>
        {!pipelines.length && <p>No pipelines right now - go create some!</p>}
        {!!pipelines.length && (
          <ol>
            {pipelines
              .filter((p) => p.ownerUserId === giUser?.value?.id)
              .map((p) => (
                <PipelineListEntry pipeline={p} />
              ))}
          </ol>
        )}

        <AdminPipelinesSection self={giUser?.value} pipelines={pipelines} />
      </PageContent>
    </>
  );
}
