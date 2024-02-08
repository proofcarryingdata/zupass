import { ReactNode } from "react";
import styled from "styled-components";

export function LatestAtomsSection({
  latestAtoms
}: {
  latestAtoms?: unknown[];
}): ReactNode {
  if (!latestAtoms) {
    return null;
  }

  return (
    <div>
      <h3>Latest Data</h3>
      {latestAtoms.length === 0 ? (
        <>
          <i>No data found</i>
        </>
      ) : (
        <>
          <ul>
            {latestAtoms.map((atom, i) => (
              <li key={i}>
                <AtomPreview atom={atom} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function AtomPreview({ atom }: { atom: unknown }): ReactNode {
  return <AtomPreviewContainer>{JSON.stringify(atom)}</AtomPreviewContainer>;
}

const AtomPreviewContainer = styled.pre``;
