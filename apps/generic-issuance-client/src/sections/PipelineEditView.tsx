import { Box, Button, Stack } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import {
  GenericIssuanceSelfResponseValue,
  PipelineDefinition
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { deletePipeline, savePipeline } from "../helpers/Mutations";
import { useJWT } from "../helpers/userHooks";
import { stringifyAndFormat } from "../helpers/util";

export function PipelineEditView({
  user,
  pipeline,
  isAdminView
}: {
  user: GenericIssuanceSelfResponseValue;
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  const userJWT = useJWT();
  const hasSetRef = useRef(false);
  const [textareaValue, setTextareaValue] = useState("");
  const [actionInProgress, setActionInProgress] = useState<
    string | undefined
  >();
  const hasEdits = stringifyAndFormat(pipeline) !== textareaValue;
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

  const onTextAreaChange = useCallback((value: string): void => {
    console.log("new value", value);
    setTextareaValue(value);
  }, []);

  const onSaveClick = useCallback(async () => {
    if (userJWT) {
      setActionInProgress(`Updating pipeline '${pipeline.id}'...`);
      const res = await savePipeline(userJWT, textareaValue);
      if (res.success) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    }
  }, [pipeline.id, textareaValue, userJWT]);

  useEffect(() => {
    if (!hasSetRef.current) {
      hasSetRef.current = true;
      setTextareaValue(stringifyAndFormat(pipeline));
    }
  }, [pipeline]);

  return (
    <Stack gap={4}>
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden" padding="8px">
        <Editor
          width="600px"
          height="400px"
          language="json"
          theme="vs-light"
          value={textareaValue}
          onChange={onTextAreaChange}
          options={{
            readonly: ownedBySomeoneElse && !isAdminView,
            minimap: {
              enabled: false
            }
          }}
        />
      </Box>
      <p>
        {(!ownedBySomeoneElse || isAdminView) && (
          <>
            {hasEdits && (
              <Button
                size="sm"
                disabled={
                  !!actionInProgress || (ownedBySomeoneElse && !isAdminView)
                }
                onClick={onSaveClick}
              >
                {actionInProgress ? "Saving..." : "Save changes"}
              </Button>
            )}
            {!hasEdits && (
              <Button size="sm" isDisabled={true}>
                No Changes
              </Button>
            )}
            <Button
              size="sm"
              colorScheme="red"
              disabled={ownedBySomeoneElse && !isAdminView}
              onClick={onDeleteClick}
            >
              Delete pipeline
            </Button>
          </>
        )}
      </p>
    </Stack>
  );
}
