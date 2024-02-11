import { PipelineType } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useState } from "react";
import { PageContent } from "../../components/Core";
import { Header } from "../../components/header/Header";
import { pipelineDetailPagePath } from "../../components/pipeline-display/PipelineDetails";
import { savePipeline } from "../../helpers/Mutations";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useJWT } from "../../helpers/userHooks";
import { SAMPLE_LEMONADE_PIPELINE } from "../SamplePipelines";
import CSVPipelineBuilder from "./pipeline-builders/CSVPipelineBuilder";
import LemonadePipelineBuilder from "./pipeline-builders/LemonadePipelineBuilder";
import PretixPipelineBuilder from "./pipeline-builders/PretixPipelineBuilder";
import RawJSONPipelineBuilder from "./pipeline-builders/RawJSONPipelineBuilder";

export default function CreatePipelinePage(): ReactNode {
  const stytchClient = useStytch();
  const userJWT = useJWT();
  const user = useFetchSelf();
  const [isUploadingPipeline, setIsUploadingPipeline] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] = useState<
    PipelineType | "JSON"
  >("JSON");

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
          <option value="JSON">JSON</option>
        </select>
        {selectedPipelineType === PipelineType.Pretix && (
          <PretixPipelineBuilder onCreate={onCreateClick} />
        )}
        {selectedPipelineType === PipelineType.CSV && (
          <CSVPipelineBuilder onCreate={onCreateClick} />
        )}
        {selectedPipelineType === PipelineType.Lemonade && (
          <LemonadePipelineBuilder onCreate={onCreateClick} />
        )}
        {selectedPipelineType === "JSON" && (
          <RawJSONPipelineBuilder
            onCreate={onCreateClick}
            initialValue={SAMPLE_LEMONADE_PIPELINE}
          />
        )}
      </PageContent>
    </>
  );
}
