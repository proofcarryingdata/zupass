import { ReactNode, useEffect, useState } from "react";
// eslint-disable-next-line import/no-named-as-default
import { stringify } from "csv-stringify/sync";
import { Matrix, Mode, Spreadsheet } from "react-spreadsheet";
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
        darkMode={true}
        data={data}
        columnLabels={parsed[0]}
        className={"sheet"}
      />
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
