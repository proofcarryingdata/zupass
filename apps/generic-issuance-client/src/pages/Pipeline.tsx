import { PipelineDefinition } from "@pcd/passport-interface";
import { ReactNode, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { deletePipeline, savePipeline } from "../helpers/Pipeline";
import { useFetchPipeline } from "../helpers/useFetchPipeline";
import { useFetchPipelineInfo } from "../helpers/useFetchPipelineInfo";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import { LatestAtomsSection } from "../sections/LatestAtomsSection";
import { LatestRunSection } from "../sections/LatestRunSection";

function format(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export default function Pipeline(): ReactNode {
  const params = useParams();
  const pipelineId: string | undefined = params.id;
  const [savedPipeline, setSavedPipeline] = useState<PipelineDefinition>();
  const [textareaValue, setTextareaValue] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const userJWT = useJWT();
  const userFromServer = useFetchSelf();
  const pipelineFromServer = useFetchPipeline(pipelineId);
  const pipelineInfoFromServer = useFetchPipelineInfo(pipelineId);
  const pipelineInfo = pipelineInfoFromServer?.value;

  if (!userJWT) {
    window.location.href = "/";
  }

  const hasEdits = format(savedPipeline ?? {}) !== textareaValue;
  const ownedBySomeoneElse =
    savedPipeline?.ownerUserId !== userFromServer?.value?.id;

  const onSaveClick = useCallback(() => {
    if (userJWT) {
      savePipeline(userJWT, textareaValue);
    }
  }, [textareaValue, userJWT]);

  const onDeleteClick = useCallback(() => {
    if (userJWT && pipelineFromServer?.value?.id) {
      deletePipeline(userJWT, pipelineFromServer?.value?.id);
    }
  }, [pipelineFromServer?.value?.id, userJWT]);

  return (
    <>
      <Header includeLinkToDashboard />
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
            {savedPipeline && (
              <>
                <p>
                  <textarea
                    cols={50}
                    rows={30}
                    value={textareaValue}
                    onChange={(e): void => setTextareaValue(e.target.value)}
                  />
                </p>
                <p>
                  {hasEdits && (
                    <button
                      disabled={saveLoading || ownedBySomeoneElse}
                      onClick={onSaveClick}
                    >
                      {saveLoading ? "Saving..." : "Save changes"}
                    </button>
                  )}
                  {!hasEdits && <button disabled>All changes saved ✅</button>}
                  <button disabled={ownedBySomeoneElse} onClick={onDeleteClick}>
                    Delete pipeline
                  </button>
                </p>
              </>
            )}
            {error && (
              <p>
                <strong>Error: </strong>
                {error}
              </p>
            )}
          </div>
          <div style={{ flexGrow: 1 }}>
            <h2>Pipeline Info</h2>
            {pipelineInfo && savedPipeline && (
              <>
                {pipelineInfo.feeds && (
                  <>
                    <h3>Feeds</h3>
                    <ol>
                      {pipelineInfo.feeds?.map((feed) => (
                        <li key={feed.url}>
                          <b>{feed.name}</b> - <a href={feed.url}>{feed.url}</a>{" "}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
                {pipelineInfo.latestRun && (
                  <LatestRunSection latestRun={pipelineInfo.latestRun} />
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
