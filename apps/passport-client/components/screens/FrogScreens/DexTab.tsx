import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import _ from "lodash";
import { useMemo } from "react";
import styled from "styled-components";
import { RippleLoader } from "../../core/RippleLoader";

/**
 * The FrogeDex tab allows users to view their progress towards collecting all frogs.
 */
export function DexTab({
  possibleFrogIds,
  pcds
}: {
  possibleFrogIds?: number[];
  pcds: EdDSAFrogPCD[];
}) {
  const names = useMemo(() => {
    const names: string[] = [];

    pcds.forEach((pcd) => {
      names[pcd.claim.data.frogId] = pcd.claim.data.name;
    });

    return names;
  }, [pcds]);

  if (!possibleFrogIds) {
    return <RippleLoader />;
  }

  return (
    <table>
      <tbody>
        {possibleFrogIds.map((i) => (
          <tr key={i}>
            <Cell>{i}</Cell>
            {names[i] ? (
              <Cell>{names[i]}</Cell>
            ) : (
              <UnknownCell>???</UnknownCell>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Cell = styled.td`
  padding: 4px;
`;

const UnknownCell = styled(Cell)`
  color: rgba(var(--white-rgb), 0.5);
`;
