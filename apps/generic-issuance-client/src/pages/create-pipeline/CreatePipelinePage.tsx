import { Heading, Select, Stack } from "@chakra-ui/react";
import { PipelineType } from "@pcd/passport-interface";
import { useStytch } from "@stytch/react";
import { ReactNode, useCallback, useState } from "react";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { pipelineDetailPagePath } from "../../components/PipelineDisplayUtils";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
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
      if (!confirm("are you sure you want to create this pipeline?")) {
        return;
      }

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
        <GlobalPageHeader user={user} stytchClient={stytchClient} />
        <LoadingContent />
      </>
    );
  }

  return (
    <>
      <GlobalPageHeader
        user={user}
        stytchClient={stytchClient}
        titleContent={(): ReactNode => (
          <Heading size="sm">Create Pipeline</Heading>
        )}
      />

      <PageContent>
        <Stack>
          <Select
            width="md"
            value={selectedPipelineType ?? ""}
            onChange={(event): void => {
              setSelectedPipelineType(event.target.value as PipelineType);
            }}
          >
            <option value="" disabled>
              Select your pipeline type...
            </option>
            {Object.entries(PipelineType).map(([key, value]) => (
              <option key={key} value={value}>
                {value}
              </option>
            ))}
            <option value="JSON">JSON</option>
          </Select>
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
        </Stack>
      </PageContent>
    </>
  );
}
