import {
  PipelineDefinition,
  PipelineInfoResponseValue,
  requestGenericIssuanceDeletePipeline,
  requestGenericIssuanceGetPipeline,
  requestGenericIssuanceUpsertPipeline,
  requestPipelineInfo
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { ZUPASS_SERVER_URL } from "../constants";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";

function format(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export default function Pipeline(): ReactNode {
  const params = useParams();
  const ownUser = useFetchSelf();
  const { id } = params;
  const [savedPipeline, setSavedPipeline] = useState<PipelineDefinition>();
  const [textareaValue, setTextareaValue] = useState("");
  const [queryLoading, setQueryLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [info, setInfo] = useState<PipelineInfoResponseValue | undefined>();
  const [error, setError] = useState("");
  const userJWT = useJWT();

  async function savePipeline(): Promise<void> {
    let pipeline: PipelineDefinition;
    try {
      pipeline = JSON.parse(textareaValue);
    } catch (e) {
      setError(`Invalid JSON object: ${e}`);
      return;
    }
    setSaveLoading(true);
    const res = await requestGenericIssuanceUpsertPipeline(ZUPASS_SERVER_URL, {
      jwt: userJWT ?? "",
      pipeline
    });
    if (res.success) {
      setSavedPipeline(res.value);
      setTextareaValue(format(res.value));
      setError("");
    } else {
      setError(`An error occured while saving: ${res.error}`);
    }
    setSaveLoading(false);
  }

  async function deletePipeline(): Promise<void> {
    if (confirm("Are you sure you would like to delete this pipeline?")) {
      const res = await requestGenericIssuanceDeletePipeline(
        ZUPASS_SERVER_URL,
        id ?? "",
        userJWT ?? ""
      );
      if (res.success) {
        window.location.href = "/#/dashboard";
      } else {
        setError(`An error occured while deleting: ${res.error}`);
      }
    }
  }

  useEffect(() => {
    async function fetchPipeline(): Promise<void> {
      const res = await requestGenericIssuanceGetPipeline(
        ZUPASS_SERVER_URL,
        id ?? "",
        userJWT ?? ""
      );

      if (res.success) {
        setSavedPipeline(res.value);
        setTextareaValue(format(res.value));
        setError("");
      } else {
        setError(
          `This pipeline "${id}" is invalid or you do not have access to this pipeline.`
        );
        setSavedPipeline(undefined);
      }

      const infoRes = await requestPipelineInfo(ZUPASS_SERVER_URL, id ?? "");
      if (infoRes.success) {
        setError("");
        setInfo(infoRes.value);
      } else {
        setError(`couldn't load pipeline info`);
      }

      setQueryLoading(false);
    }

    fetchPipeline();
  }, [id, userJWT]);

  if (!userJWT) {
    window.location.href = "/";
  }

  if (queryLoading) {
    return (
      <>
        <Header includeLinkToDashboard />
        <PageContent>Loading...</PageContent>
      </>
    );
  }

  const hasEdits = format(savedPipeline ?? {}) !== textareaValue;
  const ownedBySomeoneElse = savedPipeline?.ownerUserId !== ownUser?.value?.id;

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
                      onClick={savePipeline}
                    >
                      {saveLoading ? "Saving..." : "Save changes"}
                    </button>
                  )}
                  {!hasEdits && <button disabled>All changes saved ✅</button>}
                  <button
                    disabled={ownedBySomeoneElse}
                    onClick={deletePipeline}
                  >
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
            {info && (
              <>
                <h3>Feeds</h3>
                <ol>
                  {info.feeds.map((feed) => (
                    <li key={feed.url}>
                      <b>{feed.name}</b> - <a href={feed.url}>{feed.url}</a>{" "}
                    </li>
                  ))}
                </ol>
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
