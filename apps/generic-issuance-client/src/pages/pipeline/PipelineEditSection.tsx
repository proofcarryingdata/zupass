import { Box, Button, HStack, Stack } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { FancyEditor } from "../../components/FancyEditor";
import { deletePipeline, savePipeline } from "../../helpers/Mutations";
import { useJWT } from "../../helpers/userHooks";
import { stringifyAndFormat } from "../../helpers/util";
import { PipelineTable } from "../dashboard/PipelineTable";

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
  const [editorValue, setEditorValue] = useState(stringifyAndFormat(pipeline));
  const [actionInProgress, setActionInProgress] = useState<
    string | undefined
  >();
  const hasEdits = stringifyAndFormat(pipeline) !== editorValue;
  const ownedBySomeoneElse = pipeline.ownerUserId !== user.id;

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
    if (userJWT) {
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

  return (
    <Stack gap={4}>
      <Box maxW={"800px"}>
        <PipelineTable
          entries={singleRow}
          isAdminView={false}
          singleRowMode={true}
        />
      </Box>

      <FancyEditor
        style={{ width: "800px", height: "450px" }}
        language="json"
        value={editorValue}
        setValue={setEditorValue}
        readonly={ownedBySomeoneElse && !isAdminView}
      />

      {isAdminView && (
        <HStack>
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
        </HStack>
      )}
    </Stack>
  );
}
