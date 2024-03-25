import {
  HydratedPipelineHistoryEntry,
  PipelineInfoResponseValue
} from "@pcd/passport-interface";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { timeAgoStrLong } from "../../../components/PipelineDisplayUtils";
import { useGIContext } from "../../../helpers/Context";

export function PipelineVersionHistorySection({
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

  if (entries.length === 0) {
    return (
      <Container>
        Once you make an edit, you'll be able to revert to previous versions
        here.
      </Container>
    );
  }

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
  pipelineInfo,
  entry
}: {
  pipelineInfo: PipelineInfoResponseValue;
  entry: HydratedPipelineHistoryEntry;
}): React.ReactNode {
  const ctx = useGIContext();

  const isPreviewingThisEntry =
    ctx.viewingOlderPipelineVersion?.id === entry.id;
  const isLatestEntry = entry.id === pipelineInfo.editHistory?.[0]?.id;

  if (isPreviewingThisEntry) {
    return (
      <li>
        <b>{new Date(entry.timeCreated).toLocaleString()}</b>
        &nbsp;({timeAgoStrLong(entry.timeCreated)})&nbsp;by&nbsp;
        {entry.editorEmail ? entry.editorEmail : "system"}
        &nbsp;(viewing now)
      </li>
    );
  }

  return (
    <li>
      <Link
        onClick={(): void => {
          if (isLatestEntry) {
            ctx.setState({
              viewingOlderPipelineVersion: undefined
            });
          } else {
            ctx.setState({
              viewingOlderPipelineVersion: entry
            });
          }
        }}
        to={""}
      >
        {new Date(entry.timeCreated).toLocaleString()}
      </Link>
      &nbsp;({timeAgoStrLong(entry.timeCreated)})&nbsp;by&nbsp;
      {entry.editorEmail ? entry.editorEmail : "system"}
      &nbsp;{isLatestEntry ? "(latest)" : ""}
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

export function historyEntryDisplayName(
  entry: HydratedPipelineHistoryEntry
): string {
  return (
    new Date(entry.timeCreated).toLocaleString() +
    ` (${timeAgoStrLong(entry.timeCreated)}) ` +
    (entry.editorEmail ? " by " + entry.editorEmail : " by system")
  );
}
