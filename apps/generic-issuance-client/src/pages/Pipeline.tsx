import {
  PipelineDefinition,
  PipelineInfoResponseValue,
  requestGenericIssuanceDeletePipeline,
  requestGenericIssuanceGetPipeline,
  requestGenericIssuanceUpsertPipeline,
  requestPipelineInfo
} from "@pcd/passport-interface";
import { ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ZUPASS_SERVER_URL } from "../constants";
import { useJWT } from "../helpers/userHooks";

function format(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export default function Pipeline(): ReactNode {
  const params = useParams();
  const { id } = params;
  // TODO: After MVP, replace with RTK hooks or a more robust state management.
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
      jwt: userJWT,
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
        id,
        userJWT
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
        id,
        userJWT
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

      const infoRes = await requestPipelineInfo(ZUPASS_SERVER_URL, id);
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
    return <div>Loading...</div>;
  }

  const hasEdits = format(savedPipeline) !== textareaValue;

  return (
    <div>
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
              <button disabled={saveLoading} onClick={savePipeline}>
                {saveLoading ? "Saving..." : "Save changes"}
              </button>
            )}
            {!hasEdits && <button disabled>All changes saved ✅</button>}
          </p>
          <p>
            <button onClick={deletePipeline}>Delete pipeline</button>
          </p>
        </>
      )}
      {info && (
        <>
          {info.feeds.map((f) => (
            <div>
              feed {f.name} - <a href={f.url}>{f.url}</a>{" "}
            </div>
          ))}
        </>
      )}
      {error && (
        <p>
          <strong>Error: </strong>
          {error}
        </p>
      )}
      <p>
        <Link to="/dashboard">
          <button>Return to all pipelines</button>
        </Link>
      </p>
    </div>
  );
}
