import { EdDSAFrogPCD } from "@pcd/eddsa-frog-pcd";
import _ from "lodash";
import { useMemo } from "react";
import styled from "styled-components";

export function DexTab({
  frogs,
  pcds
}: {
  frogs?: { count?: number };
  pcds: EdDSAFrogPCD[];
}) {
  const count = frogs?.count;
  const names = useMemo(() => {
    const names: string[] = [];

    pcds.forEach((pcd) => {
      names[pcd.claim.data.frogId] = pcd.claim.data.name;
    });

    return names;
  }, [pcds]);

  if (!count) {
    return <div>loading...</div>;
  }

  return (
    <table>
      <tbody>
        {_.range(1, count).map((i) => (
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
