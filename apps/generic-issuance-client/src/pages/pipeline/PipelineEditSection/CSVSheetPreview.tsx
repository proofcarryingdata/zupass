import { PlusSquareIcon } from "@chakra-ui/icons";
import { Button, HStack, Icon } from "@chakra-ui/react";
import { stringify } from "csv-stringify/sync";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { MdDeleteOutline } from "react-icons/md";
import {
  EntireRowsSelection,
  Matrix,
  Mode,
  RangeSelection,
  Selection,
  Spreadsheet
} from "react-spreadsheet";
import styled from "styled-components";
import { parseCSV } from "./parseCSV";

export function CSVSheetPreview({
  csv,
  onChange
}: {
  csv: string;
  onChange?: (newCsv: string) => void;
}): ReactNode {
  const [parsed, setParsed] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<Error>();

  useEffect(() => {
    parseCSV(csv)
      .then((parsed) => {
        setParsed(parsed);
        setParseError(undefined);
        const copy = [...parsed];
        copy.shift();
        setData(copy.map((row) => row.map((value) => ({ value }))));
      })
      .catch((e) => {
        setParsed([]);
        setParseError(e);
      });
  }, [csv]);

  const [data, setData] = useState<Matrix<{ value: string }>>([]);

  const [selection, setSelection] = useState<Selection | undefined>(undefined);
  const validRowSelection = useMemo(() => {
    if (selection) {
      return (
        (selection instanceof RangeSelection &&
          selection.range.start.row === selection.range.end.row) ||
        selection instanceof EntireRowsSelection
      );
    }
  }, [selection]);

  const deleteRow = useCallback(
    (selection: Selection) => {
      if (
        !selection ||
        (!(selection instanceof RangeSelection) &&
          !(selection instanceof EntireRowsSelection))
      ) {
        console.error("Invalid selection for deleteRow", selection);
        return;
      }
      const rowIndices =
        selection instanceof RangeSelection
          ? // If range selection, only delete one row!
            [selection.range.start.row, selection.range.start.row]
          : [selection.start, selection.end];
      const newCSVData = parsed
        .slice(1)
        .filter((_, index) => index < rowIndices[0] || index > rowIndices[1]);
      onChange?.(stringify([parsed[0], ...newCSVData]));
    },
    [parsed, onChange]
  );

  const addRow = useCallback(() => {
    const newCSVData = [...parsed, parsed[0].map(() => "")];
    onChange?.(stringify(newCSVData));
  }, [parsed, onChange]);

  if (parseError) {
    return <Container>{parseError.message}</Container>;
  }

  return (
    <Container>
      <Spreadsheet
        onModeChange={(mode: Mode) => {
          if (mode === "view") {
            // commit data
            if (onChange) {
              const newCsv = stringify(
                // This is ugly but is necessary to ensure that the header row
                // does not get lost. The data in the table does not include
                // this row, so we have to manually include it from the initial
                // parse of the CSV file.
                [
                  parsed[0],
                  ...data.map((row) => row.map((cell) => cell?.value ?? ""))
                ]
              );
              onChange(newCsv);
            }
          }
        }}
        onChange={(data): void => {
          setData(data);
        }}
        onSelect={(selection) => {
          window.setTimeout(() => setSelection(selection), 250);
        }}
        darkMode={true}
        data={data}
        columnLabels={parsed[0]}
        className={"sheet"}
      />
      <HStack marginTop={4} spacing={4} alignItems={"start"}>
        <Button
          onClick={addRow}
          leftIcon={<Icon as={PlusSquareIcon} w={4} h={4} />}
          colorScheme="blue"
          size="sm"
        >
          Add Row
        </Button>
        <Button
          isDisabled={!validRowSelection}
          onClick={() => {
            if (selection) deleteRow(selection);
          }}
          leftIcon={<Icon as={MdDeleteOutline} w={4} h={4} />}
          colorScheme="blue"
          size="sm"
        >
          Delete Row
        </Button>
      </HStack>
    </Container>
  );
}

const clr = `rgba(47,55,70,1)`;

const Container = styled.div`
  padding: 16px 0px;
  border-radius: 4px;
  box-sizing: border-box;
  overflow: hidden;
  overflow-y: scroll;
  overflow-x: scroll;
  height: 100%;
  width: 100%;

  .sheet {
    background-color: ${clr};

    table {
      .Spreadsheet__header {
        min-width: 3em;
      }

      .Spreadsheet__data-viewer {
        padding: 0px;
        white-space: normal;
        word-break: normal;
      }

      td {
        padding: 8px;
      }
    }
  }
`;
