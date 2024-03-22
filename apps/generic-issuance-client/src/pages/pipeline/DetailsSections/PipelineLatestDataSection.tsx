import { Button } from "@chakra-ui/react";
import { ReactNode, useMemo, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { Maximizer } from "../../../components/Maximizer";

/**
 * Used to display the latest data that a given pipeline loaded during
 * the last time that it was run.
 */
export function PipelineLatestDataSection({
  latestAtoms
}: {
  latestAtoms?: unknown[];
}): ReactNode {
  const [maximized, setMaximized] = useState(false);
  const stringifiedValue = useMemo(() => {
    return (
      latestAtoms?.map((log) => JSON.stringify(log, null, 2)).join("\n\n") ?? ""
    );
  }, [latestAtoms]);

  if (!latestAtoms) {
    return null;
  }

  return (
    <>
      <Maximizer maximized={maximized} setMaximized={setMaximized}>
        <FancyEditor
          dark
          editorStyle={{ width: "100%", height: maximized ? "100vh" : "300px" }}
          containerStyle={
            maximized ? { border: "none", borderRadius: 0 } : undefined
          }
          readonly={true}
          value={stringifiedValue}
          language="javascript"
          editorOptions={
            maximized
              ? {
                  minimap: {
                    enabled: true
                  }
                }
              : {}
          }
        />

        {!maximized && (
          <Button mt={4} onClick={(): void => setMaximized(true)}>
            Maximize
          </Button>
        )}
      </Maximizer>
    </>
  );
}
