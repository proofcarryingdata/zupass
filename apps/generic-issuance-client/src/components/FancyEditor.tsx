import { Editor } from "@monaco-editor/react";
import { ReactNode, useCallback } from "react";

export function FancyEditor({
  readonly,
  value,
  setValue
}: {
  readonly: boolean;
  defaultValue?: string;
  value: string;
  setValue: (val: string) => void;
}): ReactNode {
  const onValueChange = useCallback(
    (value: string): void => {
      console.log("new value", value);
      setValue(value);
    },
    [setValue]
  );

  return (
    <Editor
      width="600px"
      height="400px"
      language="json"
      theme="vs-light"
      value={value}
      onChange={onValueChange}
      options={{
        readonly,
        minimap: {
          enabled: false
        }
      }}
    />
  );
}
