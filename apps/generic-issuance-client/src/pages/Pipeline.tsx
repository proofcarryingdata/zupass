import { getError } from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import { useStytch } from "@stytch/react";
import {
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { pipelineIcon, pipelineStatus } from "../components/PipelineDetails";
import { GIContext } from "../helpers/Context";
import { deletePipeline, savePipeline } from "../helpers/Mutations";
import { useFetchPipeline } from "../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import {
  getAllHoneycombLinkForPipeline,
  getHoneycombQueryDurationStr,
  getLoadTraceHoneycombLinkForPipeline
} from "../helpers/util";
import { LatestAtomsSection } from "../sections/LatestAtomsSection";
import { LoadSummarySection } from "../sections/LoadSummarySection";

function stringifyAndFormat(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export default function Pipeline(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const params = useParams();
  const ctx = useContext(GIContext);
  const pipelineId: string | undefined = params.id;
  const [textareaValue, setTextareaValue] = useState("");
  const textAreaRef = useRef("");
  const userFromServer = useFetchSelf();
  const pipelineFromServer = useFetchPipeline(pipelineId);
  const pipelineInfoFromServer = useFetchPipelineInfo(pipelineId);
  const pipelineInfo = pipelineInfoFromServer?.value;
  const [actionInProgress, setActionInProgress] = useState<
    string | undefined
  >();
  const hasSetRef = useRef(false);

  useEffect(() => {
    if (pipelineFromServer?.value && !hasSetRef.current) {
      hasSetRef.current = true;
      setTextareaValue(stringifyAndFormat(pipelineFromServer.value));
    }
  }, [pipelineFromServer?.value]);

  const onSaveClick = useCallback(async () => {
    if (userJWT) {
      setActionInProgress(
        `Updating pipeline '${pipelineFromServer?.value?.id}'...`
      );
      const res = await savePipeline(userJWT, textAreaRef.current);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    }
  }, [pipelineFromServer?.value?.id, userJWT]);

  const onDeleteClick = useCallback(async () => {
    if (userJWT && pipelineFromServer?.value?.id) {
      if (!confirm("Are you sure you would like to delete this pipeline?")) {
        return;
      }
      setActionInProgress(
        `Deleting pipeline '${pipelineFromServer.value.id}'...`
      );
      const res = await deletePipeline(userJWT, pipelineFromServer.value.id);
      await sleep(500);
      if (res.success) {
        window.location.href = "/#/dashboard";
      } else {
        alert(res.error);
      }
    }
  }, [pipelineFromServer?.value?.id, userJWT]);

  const onTextAreaChange = useCallback((e): void => {
    textAreaRef.current = e.target.value;
    setTextareaValue(e.target.value);
  }, []);

  const maybeRequestError: string | undefined = getError(
    userFromServer,
    pipelineFromServer,
    pipelineInfoFromServer
  );

  useEffect(() => {
    if (!userJWT) {
      window.location.href = "/";
    }
  }, [userJWT]);

  if (maybeRequestError) {
    return (
      <>
        <Header
          includeLinkToDashboard
          user={userFromServer}
          stytchClient={stytchClient}
        />
        <PageContent>
          <h2>❌ Load Error</h2>
          {maybeRequestError}
        </PageContent>
      </>
    );
  }

  if (
    !userFromServer ||
    !pipelineFromServer ||
    !pipelineInfoFromServer ||
    !pipelineInfo ||
    actionInProgress
  ) {
    return (
      <>
        <Header
          includeLinkToDashboard
          user={userFromServer}
          stytchClient={stytchClient}
        />
        <PageContent>
          {actionInProgress ? actionInProgress : "Loading..."}
        </PageContent>
      </>
    );
  }

  const hasEdits =
    stringifyAndFormat(pipelineFromServer.value ?? {}) !== textareaValue;
  const ownedBySomeoneElse =
    pipelineFromServer.value?.ownerUserId !== userFromServer?.value?.id;

  return (
    <>
      <Header
        includeLinkToDashboard
        user={userFromServer}
        stytchClient={stytchClient}
      />
      {ownedBySomeoneElse && (
        <WarningSection>
          <b>WARNING!</b> You are not the owner of this pipeline, but you can
          see it because you're an <b>admin</b>. Be <b>Careful</b>!
        </WarningSection>
      )}

      <PageContent>
        <TwoColumns>
          <div>
            <h2>Edit Pipeline</h2>
            {pipelineFromServer.value && (
              <>
                <p>
                  <textarea
                    cols={50}
                    rows={30}
                    value={textareaValue}
                    onChange={onTextAreaChange}
                    readOnly={ownedBySomeoneElse}
                  />
                </p>
                <p>
                  {!ownedBySomeoneElse && (
                    <>
                      {hasEdits && (
                        <button
                          disabled={!!actionInProgress || ownedBySomeoneElse}
                          onClick={onSaveClick}
                        >
                          {actionInProgress ? "Saving..." : "Save changes"}
                        </button>
                      )}
                      {!hasEdits && (
                        <button disabled>All changes saved ✅</button>
                      )}
                      <button
                        disabled={ownedBySomeoneElse}
                        onClick={onDeleteClick}
                      >
                        Delete pipeline
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
          <div style={{ flexGrow: 1 }}>
            {ctx.isAdminMode && userFromServer?.value?.isAdmin && (
              <>
                <h2>Admin Details</h2>
                {/* todo: honeycomb link for feed issuance - e.g. how many pcds have been issued */}
                {pipelineFromServer.value && (
                  <>
                    <ul>
                      <li>
                        <a
                          href={getLoadTraceHoneycombLinkForPipeline(
                            pipelineFromServer.value.id
                          )}
                        >
                          data load traces {getHoneycombQueryDurationStr()}
                        </a>
                      </li>
                      <li>
                        <a
                          href={getAllHoneycombLinkForPipeline(
                            pipelineFromServer.value.id
                          )}
                        >
                          all traces related to this pipeline{" "}
                          {getHoneycombQueryDurationStr()}
                        </a>
                      </li>
                    </ul>
                  </>
                )}
              </>
            )}
            <h2>Pipeline Info</h2>
            <h3>Status</h3>
            {pipelineIcon(pipelineInfo.loadSummary)}{" "}
            {pipelineStatus(pipelineInfo.loadSummary)}
            {pipelineInfo && pipelineFromServer.value && (
              <>
                {pipelineInfo.feeds && (
                  <>
                    <h3>Feeds</h3>
                    <ol>
                      {pipelineInfo.feeds?.map((feed) => (
                        <li key={feed.url}>
                          <b>{feed.name}</b>
                          {" - "}
                          <a
                            href={`${
                              process.env.PASSPORT_CLIENT_URL
                            }/#/add-subscription?url=${encodeURIComponent(
                              feed.url
                            )}`}
                          >
                            Subscription link
                          </a>
                          {" - "}
                          <a href={feed.url}>Feed Link</a>{" "}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {pipelineInfo.loadSummary && (
                  <LoadSummarySection latestRun={pipelineInfo.loadSummary} />
                )}
                {pipelineInfo.latestAtoms && (
                  <LatestAtomsSection latestAtoms={pipelineInfo.latestAtoms} />
                )}
              </>
            )}
          </div>
        </TwoColumns>
      </PageContent>
    </>
  );
}

const WarningSection = styled.div`
  padding: 16px;
  background-color: rgba(238, 255, 0, 0.1);
`;

const TwoColumns = styled.div`
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  flex-direction: row;
  gap: 32px;

  ol {
    // to override 'GlobalStyle'
    max-width: unset !important;
  }
`;
