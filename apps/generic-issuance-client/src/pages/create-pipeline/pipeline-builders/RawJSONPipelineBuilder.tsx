import { Button } from "@chakra-ui/react";
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
    <>
      <FancyEditor
        language="json"
        style={{ height: "400px" }}
        value={newPipelineJSON}
        setValue={setNewPipelineJSON}
        readonly={false}
        dark
      />

      <Button
        width="100%"
        onClick={(): Promise<void> => props.onCreate(newPipelineJSON)}
        colorScheme="green"
      >
        Create
      </Button>
    </>
  );
}
