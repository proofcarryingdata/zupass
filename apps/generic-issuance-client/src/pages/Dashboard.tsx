import {
  GenericIssuancePipelineListEntry,
  getError
} from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { PageContent, Table } from "../components/Core";
import { Header } from "../components/Header";
import {
  pipeineLastEdit,
  pipelineCreatedAt,
  pipelineIcon,
  pipelineLink,
  pipelineOwner,
  pipelineStatus,
  pipelineType
} from "../components/PipelineDetails";
import { GIContext } from "../helpers/Context";
import { useFetchAllPipelines } from "../helpers/useFetchAllPipelines";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";

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

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  const maybeRequestError: string | undefined = getError(
    pipelinesFromServer,
    user
  );
  if (maybeRequestError) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>
          <h2>Error Loading Page</h2>
          {maybeRequestError}
        </PageContent>
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
          <Link to="/create-pipeline">
            <button>Create Pipeline</button>
          </Link>
        </div>
      </PageContent>
    </>
  );
}
