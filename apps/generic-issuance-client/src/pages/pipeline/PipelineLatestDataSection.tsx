import { Table, TableContainer, Td, Th, Thead, Tr } from "@chakra-ui/react";
import { ReactNode } from "react";

/**
 * Used to display the latest data that a given pipeline loaded during
 * the last time that it was run.
 */
export function PipelineLatestDataSection({
  latestAtoms
}: {
  latestAtoms?: unknown[];
}): ReactNode {
  if (!latestAtoms) {
    return null;
  }

  return (
    <div>
      {latestAtoms.length === 0 ? (
        <>
          <i>No data found</i>
        </>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>a</Th>
              </Tr>
            </Thead>
            <tbody>
              {latestAtoms.map((row, i) => (
                <Tr key={i}>
                  <Td>{JSON.stringify(row)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
