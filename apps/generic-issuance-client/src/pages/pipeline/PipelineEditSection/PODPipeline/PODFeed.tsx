import { FormControl, FormLabel, Input, VStack } from "@chakra-ui/react";
import { PODPipelineDefinition } from "@pcd/passport-interface";
import { Dispatch, ReactNode, useCallback } from "react";
import { PODPipelineEditAction, PODPipelineEditActionType } from "./state";

export function PODFeed({
  definition,
  dispatch
}: {
  definition: PODPipelineDefinition;
  dispatch: Dispatch<PODPipelineEditAction>;
}): ReactNode {
  const feedOptions = definition.options.feedOptions;

  const onChangeField = useCallback(
    (value: string, field: string) => {
      dispatch({
        type: PODPipelineEditActionType.SetFeedOptions,
        feedOptions: {
          ...feedOptions,
          [field]: value
        }
      });
    },
    [feedOptions, dispatch]
  );

  return (
    <VStack spacing={4}>
      <FormControl>
        <FormLabel>Feed name</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedDisplayName}
          onChange={(ev) => onChangeField(ev.target.value, "feedDisplayName")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed description</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedDescription}
          onChange={(ev) => onChangeField(ev.target.value, "feedDescription")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed folder</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedFolder}
          onChange={(ev) => onChangeField(ev.target.value, "feedFolder")}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Feed ID</FormLabel>
        <Input
          type="text"
          value={feedOptions.feedId}
          onChange={(ev) => onChangeField(ev.target.value, "feedDisplayName")}
        />
      </FormControl>
    </VStack>
  );
}
