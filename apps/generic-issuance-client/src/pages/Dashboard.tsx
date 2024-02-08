import {
  GenericIssuancePipelineListEntry,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useContext, useMemo, useState } from "react";
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
} from "../components/PipelineDetails";
import { GIContext } from "../helpers/Context";
import { savePipeline } from "../helpers/Mutations";
import { useFetchAllPipelines } from "../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import { SAMPLE_CSV_PIPELINE } from "./SamplePipelines";

export default function Dashboard(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const ctx = useContext(GIContext);
  const pipelinesFromServer = useFetchAllPipelines();
  const user = useFetchSelf();

  const isAdminView = ctx.isAdminMode && user?.value?.isAdmin;

  const pipelineEntries: GenericIssuancePipelineListEntry[] = useMemo(() => {
    if (!user?.value?.id) {
      return [];
    }

    const entries = pipelinesFromServer?.value ?? [];

    if (!isAdminView) {
      return entries.filter((e) => e.pipeline.ownerUserId === user.value.id);
    }

    return entries;
  }, [isAdminView, pipelinesFromServer?.value, user?.value?.id]);

  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
  const [isUploadingPipeline, setIsUploadingPipeline] = useState(false);
  const [newPipelineJSON, setNewPipelineJSON] = useState(SAMPLE_CSV_PIPELINE);

  const onCreateClick = useCallback(() => {
    if (userJWT) {
      setIsUploadingPipeline(true);
      savePipeline(userJWT, newPipelineJSON)
        .then((res) => {
          console.log("create pipeline result", res);
          if (res.success === false) {
            alert(res.error);
          } else {
            window.location.href = "/#" + pipelineDetailPagePath(res.value?.id);
          }
        })
        .finally(() => {
          setIsUploadingPipeline(false);
        });
    }
  }, [newPipelineJSON, userJWT]);

  if (!userJWT) {
    window.location.href = "/";
  }

  if (isUploadingPipeline) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>creating pipeline...</PageContent>
      </>
    );
  }

  if (!user || !pipelinesFromServer) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>Loading...</PageContent>
      </>
    );
  }

  const requestError = getError(pipelinesFromServer, user);
  if (requestError) {
    return (
      <>
        <Header includeLinkToDashboard />
        <PageContent>
          <h2>Error Loading Page</h2>
          {requestError}
        </PageContent>
      </>
    );
  }
  return (
    <>
      <Header user={user} stytchClient={stytchClient} />
      <PageContent>
        <h2>{isAdminView ? "" : "My "} Pipelines</h2>
        {!pipelineEntries?.length ? (
          <p>No pipelines right now - go create some!</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <td>🍂</td>
                <td>status</td>
                <td>type</td>
                {isAdminView && <td>owner</td>}
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
                    {isAdminView && <td>{pipelineOwner(p)}</td>}
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
          <button onClick={(): void => setIsCreatingPipeline((curr) => !curr)}>
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
