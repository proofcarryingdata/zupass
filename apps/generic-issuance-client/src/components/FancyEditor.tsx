import { Box, Spinner } from "@chakra-ui/react";
import { Editor, Monaco } from "@monaco-editor/react";
import _ from "lodash";
import { editor } from "monaco-editor";
import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useState
} from "react";

export interface FancyEditorProps {
  value: string;
  defaultValue?: string;
  setValue?: (val: string) => void;
  editorStyle?: { width?: string; height?: string };
  containerStyle?: React.CSSProperties;
  dark?: boolean;
  language?: string;
  readonly?: boolean;
  editorOptions?: editor.IStandaloneEditorConstructionOptions;
}

export interface FancyEditorHandle {
  monaco: Monaco;
  editor: editor.IStandaloneCodeEditor;
}

/**
 * Use in place of `textarea`. This component effectively wraps
 * [@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react)
 */
export const FancyEditor = React.forwardRef(
  (
    {
      readonly,
      value,
      setValue,
      editorStyle,
      containerStyle,
      language,
      editorOptions
    }: FancyEditorProps,
    ref
  ) => {
    const [editorHandle, setEditorHandle] = useState<FancyEditorHandle>();
    useImperativeHandle(ref, () => editorHandle, [editorHandle]);

    const onValueChange = useCallback(
      (value: string): void => {
        console.log("new value", value);
        setValue?.(value);
      },
      [setValue]
    );

    const mergedEditorOptions = useMemo(() => {
      return _.merge(
        {
          readOnly: readonly,
          minimap: {
            enabled: false
          }
        },
        editorOptions ?? {}
      );
    }, [editorOptions, readonly]);

    return (
      <Box
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        width="100%"
        height="100%"
        style={containerStyle}
      >
        <Editor
          onMount={(editor, monaco): void =>
            setEditorHandle({ editor, monaco })
          }
          width={editorStyle?.width ?? "100%"}
          height={editorStyle?.height ?? "600px"}
          language={language}
          theme={"theme"}
          value={value}
          onChange={onValueChange}
          loading={<Spinner />}
          options={mergedEditorOptions}
        />
      </Box>
    );
  }
);
