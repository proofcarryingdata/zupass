import { Button } from "@chakra-ui/react";
import { PipelineLoadSummary } from "@pcd/passport-interface";
import { ReactNode, useMemo, useState } from "react";
import { FancyEditor } from "../../../components/FancyEditor";
import { Maximizer } from "../../../components/Maximizer";

/**
 * Renders information about the last time this pipeline was run by Podbox.
 * Useful for debugging an integration, and figuring out what went wrong.
 */
export function PipelineLatestLogsSection({
  lastLoad
}: {
  lastLoad?: PipelineLoadSummary;
}): ReactNode {
  const [maximized, setMaximized] = useState(false);
  const stringifiedValue = useMemo(() => {
    return (
      lastLoad?.latestLogs
        ?.map((log) => `${log.timestampCreated} - ${log.level} - ${log.value}`)
        ?.join("\n") ?? ""
    );
  }, [lastLoad?.latestLogs]);

  if (!lastLoad) {
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
