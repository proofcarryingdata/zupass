import { Box, Button, HStack } from "@chakra-ui/react";
import {
  BasePipelineOptions,
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import _ from "lodash";
import React, { ReactNode, useCallback } from "react";
import styled from "styled-components";
import {
  useGIContext,
  useViewingPipelineDefinition
} from "../../../helpers/Context";
import { deletePipeline, savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";
import { stringifyAndFormat } from "../../../helpers/util";
import { historyEntryDisplayName } from "../DetailsSections/PipelineHistorySection";

export function PipelineActions({
  user,
  isAdminView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pipelineInfo,
  pipeline,
  actionInProgress,
  setActionInProgress,
  editorValue,
  setEditorValue,
  setEditorMaximized
}: {
  actionInProgress;
  setActionInProgress;
  user: GenericIssuanceSelfResponseValue;
  pipeline: PipelineDefinition;
  pipelineInfo: PipelineInfoResponseValue;
  isAdminView: boolean;
  editorValue: string;
  setEditorValue: React.Dispatch<React.SetStateAction<string>>;
  setEditorMaximized: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactNode {
  const userJWT = useJWT();
  const ctx = useGIContext();
  const ownedBySomeoneElse = pipeline.ownerUserId !== user.id;
  const { historyEntry, pipeline: maybeHistoricPipeline } =
    useViewingPipelineDefinition(pipeline);
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
  }, [pipeline.id, setActionInProgress, userJWT]);

  const onRevertToThisVersionClick = useCallback(async () => {
    if (!historyEntry || !maybeHistoricPipeline) {
      return;
    }

    if (
      !userJWT ||
      !confirm(
        `Are you sure you want to revert to version at time ${new Date(
          historyEntry.timeCreated
        ).toLocaleString()}? `
      )
    ) {
      return;
    }

    setActionInProgress(`Reverting pipeline '${pipeline.id}'...`);
    const historicVersion: Partial<PipelineDefinition> = _.cloneDeep(
      maybeHistoricPipeline
    );
    const stringifiedDefinition = JSON.stringify(historicVersion);
    const res = await savePipeline(userJWT, stringifiedDefinition);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
    setActionInProgress(undefined);
  }, [
    historyEntry,
    maybeHistoricPipeline,
    pipeline.id,
    setActionInProgress,
    userJWT
  ]);

  const onDuplicateClick = useCallback(async () => {
    if (
      !userJWT ||
      !confirm(
        "Are you sure you would like to clone this pipeline? " +
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
  }, [pipeline, setActionInProgress, userJWT]);

  const onUndoClick = useCallback(async () => {
    if (
      pipeline &&
      confirm(
        "are you sure you want to undo these changes without saving them?"
      )
    ) {
      setEditorValue(stringifyAndFormat(pipeline));
    }
  }, [pipeline, setEditorValue]);

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
  }, [userJWT, setActionInProgress, pipeline.id, editorValue]);

  const onEscapeHistoryViewClick = useCallback(() => {
    ctx.setState({ viewingHistory: undefined });
  }, [ctx]);

  const onProtectToggleClick = useCallback(async () => {
    const pipelineProtected = !!pipeline.options.protected;
    if (
      userJWT &&
      confirm(
        `Are you sure you want to ${
          pipelineProtected ? "unprotect" : "protect"
        } this pipeline?\n\n` +
          "Protected pipelines can't be deleted.\n\n" +
          "You can always turn the protection off later.\n\n"
      )
    ) {
      setActionInProgress(`Protecting pipeline '${pipeline.id}'...`);
      const copyDefinition: Partial<PipelineDefinition> = _.cloneDeep(pipeline);
      copyDefinition.options = {
        ...copyDefinition.options,
        protected: !pipelineProtected
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } satisfies BasePipelineOptions as any;
      const stringifiedDefinition = JSON.stringify(copyDefinition);
      const res = await savePipeline(userJWT, stringifiedDefinition);
      await sleep(2000);

      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
      setActionInProgress(undefined);
    }
  }, [pipeline, setActionInProgress, userJWT]);

  if (!(isAdminView || !ownedBySomeoneElse)) {
    return null;
  }

  return (
    <Container>
      {historyEntry && (
        <Box mb={2}>{historyEntryDisplayName(historyEntry)}</Box>
      )}
      <HStack minWidth="fit-content">
        <Button size="sm" onClick={(): void => setEditorMaximized(true)}>
          Maximize
        </Button>
        {!historyEntry ? (
          <>
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

            <Button onClick={onUndoClick} size="sm" isDisabled={!hasEdits}>
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
              <>
                <Button
                  size="sm"
                  isDisabled={ownedBySomeoneElse && !isAdminView}
                  onClick={onDuplicateClick}
                >
                  Clone
                </Button>
                <Button size="sm" onClick={onProtectToggleClick}>
                  {pipeline.options.protected ? "Unprotect" : "Protect"}
                </Button>
              </>
            )}
          </>
        ) : (
          <>
            <div>
              <HStack>
                <Button
                  size="sm"
                  onClick={onRevertToThisVersionClick}
                  colorScheme="blue"
                >
                  Revert to this Version
                </Button>
                <Button size="sm" onClick={onEscapeHistoryViewClick}>
                  View Latest Version
                </Button>
              </HStack>
            </div>
          </>
        )}
      </HStack>
    </Container>
  );
}

const Container = styled.div`
  margin-top: 8px;
`;
