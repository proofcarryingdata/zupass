import { Box, Button, HStack } from "@chakra-ui/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import _ from "lodash";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  FancyEditor,
  FancyEditorHandle
} from "../../../components/FancyEditor";
import { Maximizer } from "../../../components/Maximizer";
import {
  useGIContext,
  useViewingPipelineDefinition
} from "../../../helpers/Context";
import { deletePipeline, savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";
import { stringifyAndFormat } from "../../../helpers/util";
import { historyEntryDisplayName } from "../DetailsSections/PipelineHistorySection";
import { PipelineRow } from "./PipelineRow";

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
  const { historyEntry, pipeline: maybeHistoricPipeline } =
    useViewingPipelineDefinition(pipeline);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const editorRef = useRef<FancyEditorHandle>();
  const [editorValue, setEditorValue] = useState(
    stringifyAndFormat(maybeHistoricPipeline)
  );

  useEffect(() => {
    setEditorValue(stringifyAndFormat(maybeHistoricPipeline));
  }, [maybeHistoricPipeline]);

  useEffect(() => {
    editorRef.current?.editor?.setScrollPosition({
      scrollLeft: 0,
      scrollTop: 0
    });
  }, [historyEntry]);

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
  }, [historyEntry, maybeHistoricPipeline, pipeline.id, userJWT]);

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
    <>
      <Box padding={0} mb={0} flexShrink={0}>
        <PipelineRow {...{ pipeline, pipelineInfo }} />
      </Box>

      <div style={{ flexGrow: 1, flexShrink: 1, overflow: "hidden" }}>
        <Maximizer
          maximized={editorMaximized}
          setMaximized={setEditorMaximized}
        >
          <FancyEditor
            dark
            value={editorValue}
            setValue={setEditorValue}
            readonly={(ownedBySomeoneElse && !isAdminView) || !!historyEntry}
            ref={editorRef}
            editorStyle={{
              width: editorMaximized ? "100%" : "100%",
              height: editorMaximized ? "100vh" : "100%"
            }}
            containerStyle={
              editorMaximized ? { border: "none", borderRadius: 0 } : undefined
            }
            language="json"
          />
        </Maximizer>
      </div>

      <div
        style={{
          flexShrink: undefined
        }}
      >
        {(isAdminView || !ownedBySomeoneElse) && (
          <>
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
                        !!actionInProgress ||
                        (ownedBySomeoneElse && !isAdminView)
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
                      size="sm"
                      isDisabled={ownedBySomeoneElse && !isAdminView}
                      onClick={onDuplicateClick}
                    >
                      Clone
                    </Button>
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
          </>
        )}
      </div>
    </>
  );
}
