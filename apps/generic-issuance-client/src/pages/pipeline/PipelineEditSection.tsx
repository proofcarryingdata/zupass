import { Box, Button, HStack, Stack } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
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
  const hasSetRef = useRef(false);
  const [editorValue, setEditorValue] = useState("");
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
      await sleep(500);
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

  useEffect(() => {
    if (!hasSetRef.current) {
      hasSetRef.current = true;
      setEditorValue(stringifyAndFormat(pipeline));
    }
  }, [pipeline]);

  useEffect(() => {
    console.log("asdf", {
      extraInfo: pipelineInfo,
      pipeline: pipeline
    });
  }, [pipeline, pipelineInfo]);

  return (
    <Stack gap={4}>
      <Box maxW={"800px"}>
        <PipelineTable
          entries={useMemo(() => {
            return [
              {
                extraInfo: pipelineInfo,
                pipeline: pipeline
              }
            ];
          }, [pipeline, pipelineInfo])}
          isAdminView={false}
          singleRowMode={true}
        />
      </Box>

      <FancyEditor
        style={{ width: "800px" }}
        language="json"
        value={editorValue}
        setValue={setEditorValue}
        readonly={ownedBySomeoneElse && !isAdminView}
      />

      {(!ownedBySomeoneElse || isAdminView) && (
        <HStack>
          {hasEdits && (
            <Button
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
            <Button size="sm" isDisabled={true}>
              Save Changes
            </Button>
          )}
          <Button
            size="sm"
            colorScheme="red"
            isDisabled={ownedBySomeoneElse && !isAdminView}
            onClick={onDeleteClick}
          >
            Delete Pipeline
          </Button>
          <Button onClick={onUndoClick} size="sm" isDisabled={!hasEdits}>
            Reset Changes
          </Button>
        </HStack>
      )}
    </Stack>
  );
}
