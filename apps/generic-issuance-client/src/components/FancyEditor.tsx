import { Box } from "@chakra-ui/react";
import { Editor } from "@monaco-editor/react";
import { ReactNode, useCallback } from "react";

export function FancyEditor({
  readonly,
  value,
  setValue,
  style,
  dark,
  language
}: {
  value: string;
  defaultValue?: string;
  setValue?: (val: string) => void;
  style?: React.CSSProperties;
  dark?: boolean;
  language?: string;
  readonly?: boolean;
}): ReactNode {
  const onValueChange = useCallback(
    (value: string): void => {
      console.log("new value", value);
      setValue?.(value);
    },
    [setValue]
  );

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" width="100%">
      <Editor
        width={style?.width ?? "100%"}
        height={style?.height ?? "600px"}
        language={language}
        theme={dark ? "vs-dark" : "vs-light"}
        value={value}
        onChange={onValueChange}
        options={{
          readonly: readonly,
          minimap: {
            enabled: false
          }
        }}
      />
    </Box>
  );
}
