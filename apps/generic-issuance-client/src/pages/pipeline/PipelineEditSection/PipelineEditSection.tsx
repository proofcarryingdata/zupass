import { Box, Button, HStack, Stack } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import _ from "lodash";
import { ReactNode, useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { FancyEditor } from "../../../components/FancyEditor";
import {
  useGIContext,
  useViewingPipelineDefinition
} from "../../../helpers/Context";
import { deletePipeline, savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";
import { stringifyAndFormat } from "../../../helpers/util";
import { PipelineTable } from "../../dashboard/PipelineTable";

export function PipelineEditSection({
  user,
  pipeline,
  isAdminView,
  pipelineInfo
}: {
  user: GenericIssuanceSelfResponseValue;
  pipeline: PipelineDefinition;
  pipelineInfo: PipelineInfoResponseValue;
  isAdminView: boolean;
}): ReactNode {
  const userJWT = useJWT();
  const [actionInProgress, setActionInProgress] = useState<
    string | undefined
  >();
  const ownedBySomeoneElse = pipeline.ownerUserId !== user.id;
  const { isEditHistory, pipeline: maybeHistoricPipeline } =
    useViewingPipelineDefinition(pipeline);
  const [editorValue, setEditorValue] = useState(
    stringifyAndFormat(maybeHistoricPipeline)
  );
  const hasEdits = stringifyAndFormat(maybeHistoricPipeline) !== editorValue;

  const onDeleteClick = useCallback(async () => {
    if (userJWT) {
      if (!confirm("Are you sure you would like to delete this pipeline?")) {
        return;
      }
      setActionInProgress(`Deleting pipeline '${pipeline.id}'...`);
      const res = await deletePipeline(userJWT, pipeline.id);
      if (res.success) {
        window.location.href = "/#/dashboard";
      } else {
        alert(res.error);
      }
    }
  }, [pipeline.id, userJWT]);

  const onDuplicateClick = useCallback(async () => {
    if (
      !userJWT ||
      !confirm(
        "Are you sure you would like to duplicate this pipeline? " +
          "It'll be added to your account in a 'paused' state."
      )
    ) {
      return;
    }

    setActionInProgress(`Duplicating pipeline '${pipeline.id}'...`);
    const copyDefinition: Partial<PipelineDefinition> = _.cloneDeep(pipeline);
    delete copyDefinition.id;
    delete copyDefinition.ownerUserId;
    copyDefinition.options = {
      ...copyDefinition.options,
      paused: true,
      name: (copyDefinition.options?.name ?? "untitled") + " (copy)"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const stringifiedDefinition = JSON.stringify(copyDefinition);
    const res = await savePipeline(userJWT, stringifiedDefinition);

    if (res.success) {
      window.location.href = "/#/pipelines/" + res.value.id;
    } else {
      alert(res.error);
    }
    setActionInProgress(undefined);
  }, [pipeline, userJWT]);

  const onUndoClick = useCallback(async () => {
    if (
      pipeline &&
      confirm(
        "are you sure you want to undo these changes without saving them?"
      )
    ) {
      setEditorValue(stringifyAndFormat(pipeline));
    }
  }, [pipeline]);

  const onSaveClick = useCallback(async () => {
    if (userJWT && confirm("are you sure you want to update this pipeline?")) {
      setActionInProgress(`Updating pipeline '${pipeline.id}'...`);
      const res = await savePipeline(userJWT, editorValue);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    }
  }, [pipeline.id, editorValue, userJWT]);

  const singleRow = useMemo(() => {
    return [
      {
        extraInfo: pipelineInfo,
        pipeline: pipeline
      }
    ];
  }, [pipeline, pipelineInfo]);

  const ctx = useGIContext();

  const onEscapeHistoryViewClick = useCallback(() => {
    ctx.setState({ viewingHistory: undefined });
  }, [ctx]);

  return (
    <Stack gap={4}>
      <Box maxW={"800px"}>
        <PipelineTable
          entries={singleRow}
          isAdminView={false}
          singleRowMode={true}
        />
      </Box>

      {isEditHistory && (
        <ViewingHistoryContext>
          YOU'RE VIEWING HISTORY notes:
          <br />
          {maybeHistoricPipeline?.options?.notes}
          <Button onClick={onEscapeHistoryViewClick}>Cancel</Button>
        </ViewingHistoryContext>
      )}

      <FancyEditor
        style={{ width: "800px", height: "450px" }}
        language="json"
        value={editorValue}
        setValue={setEditorValue}
        readonly={ownedBySomeoneElse && !isAdminView}
      />

      {isAdminView || !ownedBySomeoneElse ? (
        <HStack minWidth="fit-content">
          {hasEdits && (
            <Button
              variant="outline"
              size="sm"
              isDisabled={
                !!actionInProgress || (ownedBySomeoneElse && !isAdminView)
              }
              onClick={onSaveClick}
            >
              {actionInProgress ? "Saving..." : "Save Changes"}
            </Button>
          )}
          {!hasEdits && (
            <Button size="sm" isDisabled={true} variant="outline">
              Save Changes
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onUndoClick}
            size="sm"
            isDisabled={!hasEdits}
          >
            Reset Changes
          </Button>

          <Button
            variant="outline"
            size="sm"
            colorScheme="red"
            isDisabled={ownedBySomeoneElse && !isAdminView}
            onClick={onDeleteClick}
          >
            Delete Pipeline
          </Button>

          {isAdminView && (
            <Button
              variant="outline"
              size="sm"
              isDisabled={ownedBySomeoneElse && !isAdminView}
              onClick={onDuplicateClick}
            >
              Duplicate Pipeline
            </Button>
          )}
        </HStack>
      ) : (
        <></>
      )}
    </Stack>
  );
}

const ViewingHistoryContext = styled.div`
  background-color: rgba(255, 255, 255, 0.2);
  padding: 32px;
`;
