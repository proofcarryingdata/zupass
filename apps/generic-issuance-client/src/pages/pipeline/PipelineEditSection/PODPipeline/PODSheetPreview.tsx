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
  MenuItem,
  MenuList,
  Portal,
  UseMenuItemProps,
  VStack,
  useDisclosure,
  useMenuItem
} from "@chakra-ui/react";
import {
  CSVInput,
  InputColumn,
  InputValue,
  PODPipelineInput,
  PODPipelineInputFieldType,
  PODPipelineInputType
} from "@pcd/passport-interface";
import { stringify } from "csv-stringify/sync";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
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
import { BooleanEditor, BooleanViewer } from "./cells/BooleanCell";
import { DateEditor, DateViewer } from "./cells/DateCell";
import { IntegerEditor, IntegerViewer } from "./cells/IntegerCell";
import { AddColumnModal } from "./modals/AddColumnModal";
import { DeleteColumnDialog } from "./modals/DeleteColumnDialog";

/**
 * Default values for new cells in columns of specific types
 */
const COLUMN_DEFAULTS = {
  [PODPipelineInputFieldType.String]: "",
  [PODPipelineInputFieldType.Integer]: "0",
  [PODPipelineInputFieldType.Boolean]: "false",
  [PODPipelineInputFieldType.Date]: "",
  [PODPipelineInputFieldType.UUID]: ""
};

/**
 * Viewer and editor components for each type of cell
 */
const COLUMN_CELLS = {
  [PODPipelineInputFieldType.Integer]: {
    DataViewer: IntegerViewer,
    DataEditor: IntegerEditor
  },
  [PODPipelineInputFieldType.Boolean]: {
    DataViewer: BooleanViewer,
    DataEditor: BooleanEditor
  },
  [PODPipelineInputFieldType.Date]: {
    DataViewer: DateViewer,
    DataEditor: DateEditor
  },
  // For UUIDs and strings, use the default editor
  [PODPipelineInputFieldType.UUID]: {},
  [PODPipelineInputFieldType.String]: {}
};

type HeaderRowProps = React.PropsWithChildren & {
  onAddColumn: () => void;
};

function HeaderRow(props: HeaderRowProps): ReactNode {
  const { onAddColumn, ...rowProps } = props;
  return (
    <tr {...rowProps}>
      {props.children}
      <th>
        <Button onClick={onAddColumn}>
          <PlusSquareIcon />
        </Button>
      </th>
    </tr>
  );
}

function Row(props: React.PropsWithChildren): ReactNode {
  return (
    <tr {...props}>
      {props.children}
      <td></td>
    </tr>
  );
}

function MenuInput(props: UseMenuItemProps & InputProps): ReactNode {
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
  columns,
  column,
  label,
  onDelete
}: {
  columns: Record<string, InputColumn>;
  column: number;
  label?: React.ReactNode | null;
  onDelete: (name: string) => void;
}): ReactNode {
  const columnNames = useMemo(() => Object.keys(columns), [columns]);
  // Select an icon for the column based on the column's data type
  const icon = useMemo(() => {
    const type = columns[columnNames[column]].type;
    switch (type) {
      case PODPipelineInputFieldType.String:
        return <Icon as={MdShortText} w={4} h={4} />;
      case PODPipelineInputFieldType.Integer:
        return <Icon as={MdNumbers} w={4} h={4} />;
      case PODPipelineInputFieldType.Boolean:
        return <Icon as={MdCheckCircleOutline} w={4} h={4} />;
      case PODPipelineInputFieldType.Date:
        return <Icon as={MdDateRange} w={4} h={4} />;
      case PODPipelineInputFieldType.UUID:
        return <Icon as={MdKey} w={4} h={4} />;
    }
  }, [columns, column, columnNames]);
  return (
    <th>
      <Menu>
        <MenuButton
          w="100%"
          as={Button}
          leftIcon={icon}
          rightIcon={<ChevronDownIcon />}
        >
          {label ?? columnNames[column]}
        </MenuButton>
        <Portal>
          <MenuList>
            <MenuInput value={columnNames[column]} />
            <MenuDivider />
            {/* <MenuGroup title="Data Type">
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
            <MenuDivider /> */}
            <MenuItem
              icon={<Icon as={MdDeleteOutline} w={4} h={4} />}
              onClick={() => onDelete(columnNames[column])}
            >
              Delete Column
            </MenuItem>
          </MenuList>
        </Portal>
      </Menu>
    </th>
  );
}

export function PODSheetPreview({
  csvInput,
  onChange
}: {
  csvInput: CSVInput;
  onChange: (newInput: PODPipelineInput) => void;
}): ReactNode {
  const columns = useMemo(() => csvInput.getColumns(), [csvInput]);
  const data = useMemo(
    () =>
      csvInput.getRows().map((row) =>
        Object.entries(row).map(([columnName, value]) => ({
          value: value,
          ...COLUMN_CELLS[columns[columnName].type]
        }))
      ),
    [csvInput, columns]
  );

  const [updateTimeout, setUpdateTimeout] = useState<
    NodeJS.Timeout | undefined
  >(undefined);

  const doUpdate = useCallback(
    (data: Matrix<{ value: InputValue }>) => {
      // commit data
      if (onChange) {
        const filteredData = data.filter((row) => {
          return !row.every(
            (cell) => cell === undefined || cell.value === undefined
          );
        });
        if (filteredData.length === 0) {
          filteredData.push(
            Object.keys(csvInput.getColumns()).map(() => ({ value: "" }))
          );
        }
        const newCsv = stringify([
          // Add in a header row
          Object.keys(csvInput.getColumns()),
          // Take the remaining data from the spreadsheet
          ...filteredData.map((row) => row.map((cell) => cell?.value ?? ""))
        ]);
        const newInput = {
          type: PODPipelineInputType.CSV,
          columns: csvInput.getColumns(),
          csv: newCsv
        } satisfies PODPipelineInput;
        onChange(newInput);
      }
      clearTimeout(updateTimeout);
      setUpdateTimeout(undefined);
    },
    [onChange, updateTimeout, csvInput]
  );

  const addRow = useCallback(() => {
    const newCsv = stringify([
      [...Object.keys(csvInput.getColumns())],
      ...csvInput.getRows().map((row) => [...Object.values(row)]),
      Object.values(csvInput.getColumns()).map(
        (col) => COLUMN_DEFAULTS[col.type]
      )
    ]);
    const newInput = {
      csv: newCsv,
      columns: csvInput.getColumns(),
      type: PODPipelineInputType.CSV
    } satisfies PODPipelineInput;
    onChange(newInput);
  }, [csvInput, onChange]);

  const {
    isOpen: isAddColumnModalOpen,
    onOpen: openAddColumnModal,
    onClose: closeAddColumnModal
  } = useDisclosure();

  const {
    isOpen: isDeleteColumnModalOpen,
    onOpen: openDeleteColumnModal,
    onClose: closeDeleteColumnModal
  } = useDisclosure();

  const addColumn = useCallback(
    (name: string, type: PODPipelineInputFieldType) => {
      const defaultValue = COLUMN_DEFAULTS[type];
      const newCsv = stringify([
        [...Object.keys(csvInput.getColumns()), name],
        ...csvInput
          .getRows()
          .map((row) => [...Object.values(row), defaultValue])
      ]);
      const newInput = {
        type: PODPipelineInputType.CSV,
        columns: {
          // Map from InputColumn objects to the type required by the pipeline
          // configuration format
          ...Object.fromEntries(
            Object.entries(csvInput.getColumns()).map(([key, { type }]) => [
              key,
              { type }
            ])
          ),
          [name]: { type }
        },
        csv: newCsv
      } satisfies PODPipelineInput;
      onChange(newInput);
      closeAddColumnModal();
    },
    [csvInput, onChange, closeAddColumnModal]
  );

  const CustomHeaderRow = useCallback(
    (props: React.PropsWithChildren) => {
      return <HeaderRow {...props} onAddColumn={openAddColumnModal} />;
    },
    [openAddColumnModal]
  );

  const [columnToDeleteName, setColumnToDeleteName] = useState<string>("");

  const onDeleteColumn = useCallback(
    (name: string) => {
      setColumnToDeleteName(name);
      openDeleteColumnModal();
    },
    [openDeleteColumnModal]
  );

  const onDeleteColumnConfirmed = useCallback(() => {
    const name = columnToDeleteName;
    const keys = Object.keys(csvInput.getColumns());
    const index = keys.indexOf(name);
    const newCsv = stringify([
      keys.filter((key) => key !== name),
      ...csvInput
        .getRows()
        .map((row) => Object.values(row).filter((_value, i) => i !== index))
    ]);
    const newInput = {
      type: PODPipelineInputType.CSV,
      columns: {
        // Map from InputColumn objects to the type required by the pipeline
        // configuration format
        ...Object.fromEntries(
          Object.entries(csvInput.getColumns())
            .filter(([key]) => key !== name)
            .map(([key, { type }]) => [key, { type }])
        )
      },
      csv: newCsv
    } satisfies PODPipelineInput;
    onChange(newInput);
    setColumnToDeleteName("");
    closeDeleteColumnModal();
  }, [closeDeleteColumnModal, columnToDeleteName, csvInput, onChange]);

  const CustomColumnIndicator = useCallback(
    (props: { column: number; label?: React.ReactNode | null }) => {
      return (
        <ColumnIndicator
          columns={columns}
          onDelete={onDeleteColumn}
          {...props}
        />
      );
    },
    [columns, onDeleteColumn]
  );

  return (
    <Container>
      <DeleteColumnDialog
        isOpen={isDeleteColumnModalOpen}
        onClose={closeDeleteColumnModal}
        onDelete={onDeleteColumnConfirmed}
        name={columnToDeleteName}
      />
      <AddColumnModal
        isOpen={isAddColumnModalOpen}
        onClose={closeAddColumnModal}
        onAddColumn={addColumn}
        columns={csvInput.getColumns()}
      />
      <Spreadsheet
        onModeChange={(mode: Mode) => {
          if (mode === "view") {
            doUpdate(data);
          }
        }}
        onChange={(data): void => {
          doUpdate(data);
        }}
        ColumnIndicator={CustomColumnIndicator}
        HeaderRow={CustomHeaderRow}
        Row={Row}
        darkMode={true}
        data={data}
        columnLabels={Object.keys(columns)}
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
  padding: 0px;
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
