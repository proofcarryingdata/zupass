import {
  HydratedPipelineHistoryEntry,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useGIContext } from "../../../helpers/Context";

export function PipelineHistorySection({
  pipelineInfo
}: {
  pipelineInfo: PipelineInfoResponseValue;
}): React.ReactNode {
  const entries = useMemo(() => {
    const entries = pipelineInfo.editHistory ?? [];
    entries.sort(
      (a, b) =>
        new Date(b.timeCreated).getTime() - new Date(a.timeCreated).getTime()
    );
    return entries;
  }, [pipelineInfo.editHistory]);

  return (
    <Container>
      <ul>
        {entries.map((e, i) => (
          <Entry pipelineInfo={pipelineInfo} entry={e} key={i} />
        ))}
      </ul>
    </Container>
  );
}

function Entry({
  entry
}: {
  pipelineInfo: PipelineInfoResponseValue;
  entry: HydratedPipelineHistoryEntry;
}): React.ReactNode {
  const ctx = useGIContext();

  return (
    <li>
      <Link
        onClick={(): void => {
          ctx.setState({
            viewingHistory: entry
          });
        }}
        to={""}
      >
        {new Date(entry.timeCreated).toLocaleString()}
      </Link>
      &nbsp;by {entry.editorEmail ? entry.editorEmail : "system"}
    </li>
  );
}

const Container = styled.div`
  max-width: 100%;
  width: 100%;
  overflow: hidden;

  ul {
    padding-left: 32px;
  }
`;
