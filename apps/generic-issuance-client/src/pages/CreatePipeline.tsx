import { PipelineType } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useContext, useState } from "react";
import { PageContent } from "../components/Core";
import { Header } from "../components/Header";
import { pipelineDetailPagePath } from "../components/PipelineDetails";
import PretixPipelineBuilder from "../components/PretixPipelineBuilder";
import { GIContext } from "../helpers/Context";
import { savePipeline } from "../helpers/Mutations";
import { useFetchSelf } from "../helpers/useFetchSelf";
import { useJWT } from "../helpers/userHooks";
import { SAMPLE_CSV_PIPELINE } from "./SamplePipelines";

export default function CreatePipeline(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const user = useFetchSelf();
  const _ctx = useContext(GIContext);
  const [isUploadingPipeline, setIsUploadingPipeline] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] =
    useState<PipelineType>();
  // Update
  const [newPipelineJSON, setNewPipelineJSON] = useState(SAMPLE_CSV_PIPELINE);

  const onCreateClick = useCallback(
    async (pipelineStringified: string) => {
      if (userJWT) {
        setIsUploadingPipeline(true);
        savePipeline(userJWT, pipelineStringified)
          .then((res) => {
            console.log("create pipeline result", res);
            if (res.success === false) {
              alert(res.error);
            } else {
              window.location.href =
                "/#" + pipelineDetailPagePath(res.value?.id);
            }
          })
          .finally(() => {
            setIsUploadingPipeline(false);
          });
      }
    },
    [userJWT]
  );

  if (isUploadingPipeline) {
    return (
      <>
        <Header user={user} stytchClient={stytchClient} />
        <PageContent>creating pipeline...</PageContent>
      </>
    );
  }

  return (
    <>
      <Header user={user} stytchClient={stytchClient} />
      <PageContent>
        <h1>Create your pipeline</h1>
        <select
          placeholder="Select your pipeline type.."
          value={selectedPipelineType ?? ""}
          onChange={(event): void => {
            setSelectedPipelineType(event.target.value as PipelineType);
          }}
        >
          <option value="" disabled selected>
            Select your pipeline type...
          </option>
          {Object.entries(PipelineType).map(([key, value]) => (
            <option key={key} value={value}>
              {value}
            </option>
          ))}
        </select>
        {selectedPipelineType === PipelineType.Pretix && (
          <PretixPipelineBuilder onCreate={onCreateClick} />
        )}
        {selectedPipelineType === PipelineType.Lemonade && (
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
              <button
                onClick={(): Promise<void> => onCreateClick(newPipelineJSON)}
              >
                🐒 Create! 🚀
              </button>
            </div>
          </div>
        )}
      </PageContent>
    </>
  );
}
