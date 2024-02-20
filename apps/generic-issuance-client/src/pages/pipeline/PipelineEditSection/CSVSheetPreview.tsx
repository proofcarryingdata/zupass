import { ReactNode, useEffect, useMemo, useState } from "react";
// eslint-disable-next-line import/no-named-as-default
import Spreadsheet from "react-spreadsheet";
import styled from "styled-components";
import { parseCSV } from "./parseCSV";

export function CSVSheetPreview({ csv }: { csv: string }): ReactNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parsed, setParsed] = useState<string[][]>([]);
  const [parseError, setParseError] = useState<Error>();

  useEffect(() => {
    console.log("parsing csv", csv);
    parseCSV(csv)
      .then((parsed) => {
        setParsed(parsed);
        setParseError(undefined);
        console.log("parsed", parsed);
      })
      .catch((e) => {
        setParsed([]);
        setParseError(e);
      });
  }, [csv]);

  useEffect(() => {
    console.log("TEST", parsed, parseError);
  }, [parseError, parsed]);

  const data: Array<Array<{ value: string }>> = useMemo(() => {
    const copy = [...parsed];
    copy.shift();

    return copy.map((row) => row.map((value) => ({ value })));
  }, [parsed]);

  return (
    <Container>
      <Spreadsheet
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
  padding: 16px;
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
      td {
        padding: 8px;
      }
    }
  }
`;
