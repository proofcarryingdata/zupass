import { Button } from "@chakra-ui/react";
import { PipelineLoadSummary } from "@pcd/passport-interface";
import React, { ReactNode, useMemo, useState } from "react";
import styled from "styled-components";
import { FancyEditor } from "../../../components/FancyEditor";

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

export function Maximizer({
  children,
  maximized,
  setMaximized
}: {
  children: ReactNode | ReactNode[] | undefined;
  maximized?: boolean;
  setMaximized?: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactNode {
  if (maximized) {
    return (
      <MaximizerContainer>
        {children}
        <MinimizeContainer>
          <Button colorScheme="red" onClick={(): void => setMaximized?.(false)}>
            minimize
          </Button>
        </MinimizeContainer>
      </MaximizerContainer>
    );
  }

  return <>{children}</>;
}

const MinimizeContainer = styled.div`
  position: fixed;
  bottom: 0;
  right: 0;
  padding: 16px;
`;

const MaximizerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;

  min-width: 100vw;
  min-height: 100vh;
  overflow: hidden;
  background-color: black;
`;
