import { ReactNode } from "react";
import styled from "styled-components";
import { Table } from "../components/Core";

/**
 * Used to display the latest data that a given pipeline loaded during
 * the last time that it was run.
 */
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
        <TableContainer>
          <Table>
            <tbody>
              {latestAtoms.map((row, i) => (
                <tr key={i}>
                  <td>{JSON.stringify(row)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

const TableContainer = styled.div``;
