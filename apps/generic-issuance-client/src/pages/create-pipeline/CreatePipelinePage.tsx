import { Heading, Select, Stack } from "@chakra-ui/react";
import { PipelineType } from "@pcd/passport-interface";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { PageContent } from "../../components/Core";
import { LoadingContent } from "../../components/LoadingContent";
import { pipelineDetailPagePath } from "../../components/PipelineDisplayUtils";
import { GlobalPageHeader } from "../../components/header/GlobalPageHeader";
import { savePipeline } from "../../helpers/Mutations";
import { useFetchSelf } from "../../helpers/useFetchSelf";
import { useIsAdminView } from "../../helpers/useIsAdminView";
import { useJWT } from "../../helpers/userHooks";
import { SAMPLE_LEMONADE_PIPELINE } from "../SamplePipelines";
import CSVPipelineBuilder from "./pipeline-builders/CSVPipelineBuilder";
import CSVTicketPipelineBuilder from "./pipeline-builders/CSVTicketPipelineBuilder";
import LemonadePipelineBuilder from "./pipeline-builders/LemonadePipelineBuilder";
import PODPipelineBuilder from "./pipeline-builders/PODPipelineBuilder";
import PretixPipelineBuilder from "./pipeline-builders/PretixPipelineBuilder";
import RawJSONPipelineBuilder from "./pipeline-builders/RawJSONPipelineBuilder";

type ClientPipelineType = PipelineType | "JSON";

export default function CreatePipelinePage(): ReactNode {
  const userJWT = useJWT();
  const user = useFetchSelf();
  const [isUploadingPipeline, setIsUploadingPipeline] = useState(false);
  const [selectedPipelineType, setSelectedPipelineType] =
    useState<ClientPipelineType>(PipelineType.CSVTicket);
  const isAdminView = useIsAdminView(user?.value);

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

  /**
   * Non-admin users can only create pipelines of the given types.
   * Complete set of pipeline types can be found in {@link PipelineType}.
   */
  const NON_ADMIN_PIPELINE_TYPES: ClientPipelineType[] = useMemo(
    () => [PipelineType.CSVTicket],
    []
  );

  const options = useMemo(() => {
    let optionEntries = Object.entries(PipelineType) as [
      ClientPipelineType,
      string
    ][];
    optionEntries.push(["JSON", "JSON"]);

    if (!isAdminView) {
      optionEntries = optionEntries.filter(([k]) => {
        return NON_ADMIN_PIPELINE_TYPES.includes(k);
      });
    }

    return optionEntries.map(([k, v]) => (
      <option key={k} value={v}>
        pipeline type: {v}
      </option>
    ));
  }, [NON_ADMIN_PIPELINE_TYPES, isAdminView]);

  if (isUploadingPipeline) {
    return (
      <>
        <GlobalPageHeader user={user} />
        <LoadingContent />
      </>
    );
  }

  return (
    <>
      <GlobalPageHeader
        user={user}
        titleContent={(): ReactNode => (
          <Heading size="sm">Create a Pipeline</Heading>
        )}
      />

      <PageContent style={{ padding: "16px" }}>
        <Stack gap={2}>
          {options.length > 1 && (
            <Select
              bg="rgba(29,29,29,1)"
              width="100%"
              value={selectedPipelineType ?? ""}
              onChange={(event): void => {
                setSelectedPipelineType(event.target.value as PipelineType);
              }}
            >
              <option value="" disabled>
                Select your pipeline type...
              </option>
              {options}
            </Select>
          )}

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

          {selectedPipelineType === PipelineType.POD && (
            <PODPipelineBuilder onCreate={onCreateClick} />
          )}

          {selectedPipelineType === PipelineType.CSVTicket && (
            <CSVTicketPipelineBuilder onCreate={onCreateClick} />
          )}
        </Stack>
      </PageContent>
    </>
  );
}
