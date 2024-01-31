import { useStytchUser } from "@stytch/react";
import axios from "axios";
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
  const [savedPipeline, setSavedPipeline] = useState();
  const [textareaValue, setTextareaValue] = useState("");
  const [queryLoading, setQueryLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  async function savePipeline(): Promise<void> {
    setSaveLoading(true);
    try {
      const { data } = await axios.put(
        new URL(`generic-issuance/api/pipelines`, ZUPASS_SERVER_URL).href,
        JSON.parse(textareaValue),
        {
          withCredentials: true
        }
      );
      setSavedPipeline(data);
      setTextareaValue(format(data));
    } catch (e) {
      alert(`An error occured while saving: ${e}`);
    } finally {
      setSaveLoading(false);
    }
  }

  async function deletePipeline(): Promise<void> {
    if (confirm("Are you sure you would like to delete this pipeline?")) {
      try {
        await axios.delete(
          new URL(`generic-issuance/api/pipelines/${id}`, ZUPASS_SERVER_URL)
            .href,
          {
            withCredentials: true
          }
        );
        window.location.href = "/";
      } catch (e) {
        alert(`An error occured while deleting: ${e}`);
      }
    }
  }

  useEffect(() => {
    async function fetchPipeline(): Promise<void> {
      const res = await fetch(
        new URL(`generic-issuance/api/pipelines/${id}`, ZUPASS_SERVER_URL).href,
        {
          credentials: "include"
        }
      );
      const data = await res.json();
      setSavedPipeline(data);
      setTextareaValue(format(data));
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

  if (!savedPipeline) {
    return (
      <div>
        This pipeline id is invalid or you do not have access to this pipeline.
      </div>
    );
  }

  const hasEdits = format(savedPipeline) !== textareaValue;

  return (
    <div>
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
      <p>
        <Link to="/dashboard">
          <button>Return to all pipelines</button>
        </Link>
      </p>
    </div>
  );
}
