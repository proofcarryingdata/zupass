import { Button } from "@chakra-ui/react";
import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode, useMemo, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { Maximizer } from "../../../components/Maximizer";
import { SectionContainer } from "../SectionContainer";

/**
 * Used to display the latest data that a given pipeline loaded during
 * the last time that it was run.
 */
export function PipelineLatestDataSection({
  latestAtoms,
  lastLoad
}: {
  latestAtoms?: unknown[];
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  const [maximized, setMaximized] = useState(false);
  const stringifiedValue = useMemo(() => {
    if (!latestAtoms) return "";
    return JSON.stringify(latestAtoms, null, 2);
  }, [latestAtoms]);

  if (!latestAtoms || !lastLoad) {
    return (
      <SectionContainer>
        Once this pipeline loads some data, the latest data will be displayed
        here.
      </SectionContainer>
    );
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
