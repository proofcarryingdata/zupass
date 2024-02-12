import { Button, Stack } from "@chakra-ui/react";
import { ReactNode, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";

interface RawJSONPipelineBuilderProps {
  onCreate: (pipelineStringified: string) => Promise<void>;
  initialValue?: string;
}

export default function RawJSONPipelineBuilder(
  props: RawJSONPipelineBuilderProps
): ReactNode {
  const [newPipelineJSON, setNewPipelineJSON] = useState(
    props.initialValue ?? ""
  );
  return (
    <Stack>
      <FancyEditor
        language="json"
        style={{ height: "400px" }}
        value={newPipelineJSON}
        setValue={setNewPipelineJSON}
        readonly={false}
        dark
      />
      <Button
        onClick={(): Promise<void> => props.onCreate(newPipelineJSON)}
        variant="outline"
        colorScheme="green"
      >
        Create
      </Button>
    </Stack>
  );
}
