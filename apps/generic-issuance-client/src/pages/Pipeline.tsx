import {
  PipelineDefinition,
  requestGenericIssuanceDeletePipeline,
  requestGenericIssuanceGetPipeline,
  requestGenericIssuanceUpsertPipeline
} from "@pcd/passport-interface";
import { useStytchUser } from "@stytch/react";
import { ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ZUPASS_SERVER_URL } from "../constants";

function format(obj: object): string {
  return JSON.stringify(obj, null, 2);
}

export default function Pipeline(): ReactNode {
  const params = useParams();
  const { user } = useStytchUser();
  const { id } = params;
  // TODO: After MVP, replace with RTK hooks or a more robust state management.
  const [savedPipeline, setSavedPipeline] = useState<PipelineDefinition>();
  const [textareaValue, setTextareaValue] = useState("");
  const [queryLoading, setQueryLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");

  async function savePipeline(): Promise<void> {
    setSaveLoading(true);
    const res = await requestGenericIssuanceUpsertPipeline(
      ZUPASS_SERVER_URL,
      JSON.parse(textareaValue)
    );
    if (res.success) {
      setSavedPipeline(res.value);
      setTextareaValue(format(res.value));
    } else {
      setError(`An error occured while saving: ${res.error}`);
    }
    setSaveLoading(false);
  }

  async function deletePipeline(): Promise<void> {
    if (confirm("Are you sure you would like to delete this pipeline?")) {
      const res = await requestGenericIssuanceDeletePipeline(
        ZUPASS_SERVER_URL,
        id
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
        id
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
      setQueryLoading(false);
    }
    fetchPipeline();
  }, [id]);

  if (!user) {
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
