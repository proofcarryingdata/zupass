import { ChevronDownIcon, PlusSquareIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Icon,
  Input,
  InputProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Portal,
  UseMenuItemProps,
  VStack,
  useMenuItem
} from "@chakra-ui/react";
import { stringify } from "csv-stringify/sync";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import {
  MdCheckCircleOutline,
  MdDateRange,
  MdDeleteOutline,
  MdKey,
  MdNumbers,
  MdShortText
} from "react-icons/md";
import { Matrix, Mode, Spreadsheet } from "react-spreadsheet";
import styled from "styled-components";
import { parseCSV } from "../parseCSV";

function HeaderRow(props: React.PropsWithChildren) {
  return (
    <tr {...props}>
      {props.children}
      <th>
        <Button>
          <PlusSquareIcon />
        </Button>
      </th>
    </tr>
  );
}

function Row(props: React.PropsWithChildren) {
  return (
    <tr {...props}>
      {props.children}
      <td></td>
    </tr>
  );
}

function MenuInput(props: UseMenuItemProps & InputProps) {
  const { role, ...rest } = useMenuItem(props);
  const navigationKeys = ["ArrowUp", "ArrowDown", "Escape"];
  return (
    <Box px="3" py="1" role={role}>
      <Input
        placeholder="Enter value"
        size="md"
        {...rest}
        onKeyDown={(e) => {
          if (!navigationKeys.includes(e.key)) {
            e.stopPropagation();
          }
        }}
      />
    </Box>
  );
}

function ColumnIndicator({
  column,
  label
}: {
  column: number;
  label?: string;
}) {
  return (
    <th>
      <Menu>
        <MenuButton w="100%" as={Button} rightIcon={<ChevronDownIcon />}>
          {label ?? column.toString()}
        </MenuButton>
        <Portal>
          <MenuList>
            <MenuInput value={label} />
            <MenuDivider />
            <MenuGroup title="Data Type">
              <MenuItem icon={<Icon as={MdShortText} w={4} h={4} />}>
                Text
              </MenuItem>
              <MenuItem icon={<Icon as={MdNumbers} w={4} h={4} />}>
                Integer
              </MenuItem>
              <MenuItem icon={<Icon as={MdCheckCircleOutline} w={4} h={4} />}>
                Boolean
              </MenuItem>
              <MenuItem icon={<Icon as={MdDateRange} w={4} h={4} />}>
                Date
              </MenuItem>
              <MenuItem icon={<Icon as={MdKey} w={4} h={4} />}>UUID</MenuItem>
            </MenuGroup>
            <MenuDivider />
            <MenuItem icon={<Icon as={MdDeleteOutline} w={4} h={4} />}>
              Delete Column
            </MenuItem>
          </MenuList>
        </Portal>
      </Menu>
    </th>
  );
}

export function PODSheetPreview({
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

  const [updateTimeout, setUpdateTimeout] = useState<
    NodeJS.Timeout | undefined
  >(undefined);

  const doUpdate = useCallback(
    (data: Matrix<{ value: string }>) => {
      // commit data
      if (onChange) {
        const filteredData = data.filter((row) => {
          return !row.every(
            (cell) => cell === undefined || cell.value === undefined
          );
        });
        if (filteredData.length === 0) {
          filteredData.push(parsed[0].map(() => ({ value: "" })));
        }
        const newCsv = stringify(
          // This is ugly but is necessary to ensure that the header row
          // does not get lost. The data in the table does not include
          // this row, so we have to manually include it from the initial
          // parse of the CSV file.
          [
            parsed[0],
            ...filteredData.map((row) => row.map((cell) => cell?.value ?? ""))
          ]
        );
        if (newCsv !== csv) {
          onChange(newCsv);
        }
      }
      clearTimeout(updateTimeout);
      setUpdateTimeout(undefined);
    },
    [csv, onChange, parsed, updateTimeout]
  );

  const addRow = useCallback(() => {
    if (onChange) {
      const newCsv = stringify([...parsed, parsed[0].map(() => "")]);
      onChange(newCsv);
    }
  }, [onChange, parsed]);

  const addColumn = useCallback(() => {
    if (onChange) {
      const name = prompt("Enter the name for the new column", "newColumn");
      if (!name) {
        return;
      }
      const newCsv = stringify(
        parsed.map((row, index) => {
          return [...row, index === 0 ? name : ""];
        })
      );
      onChange(newCsv);
    }
  }, [onChange, parsed]);

  if (parseError) {
    return <Container>{parseError.message}</Container>;
  }

  return (
    <Container>
      <Spreadsheet
        onModeChange={(mode: Mode) => {
          if (mode === "view") {
            doUpdate(data);
          }
        }}
        onChange={(data): void => {
          doUpdate(data);
        }}
        ColumnIndicator={ColumnIndicator}
        HeaderRow={HeaderRow}
        Row={Row}
        darkMode={true}
        data={data}
        columnLabels={parsed[0]}
        className={"sheet"}
      />
      <VStack spacing={2} alignItems={"start"}>
        <Button onClick={addRow} colorScheme="blue">
          Add row
        </Button>
      </VStack>
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
  text-align: left;
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
