import { Button, HStack, Stack } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import _ from "lodash";
import { ReactNode, useCallback, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import {
  useGIContext,
  useViewingPipelineDefinition
} from "../../../helpers/Context";
import { deletePipeline, savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";
import { stringifyAndFormat } from "../../../helpers/util";
import { SectionContainer } from "../PipelineDetailSection";

export const EDIT_SECTION_WIDTH = "800px";

export function PipelineEditSection({
  user,
  pipeline,
  isAdminView
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

  const ctx = useGIContext();

  const onEscapeHistoryViewClick = useCallback(() => {
    ctx.setState({ viewingHistory: undefined });
  }, [ctx]);

  return (
    <Stack gap={4}>
      <FancyEditor
        style={{ width: EDIT_SECTION_WIDTH, height: "450px" }}
        language="json"
        value={editorValue}
        setValue={setEditorValue}
        readonly={ownedBySomeoneElse && !isAdminView}
      />

      {isAdminView || !ownedBySomeoneElse ? (
        <SectionContainer>
          <HStack minWidth="fit-content">
            {!isEditHistory ? (
              <>
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
              </>
            ) : (
              <>
                <Button size="sm" onClick={onEscapeHistoryViewClick}>
                  Cancel
                </Button>
              </>
            )}
          </HStack>
        </SectionContainer>
      ) : (
        <></>
      )}
    </Stack>
  );
}
