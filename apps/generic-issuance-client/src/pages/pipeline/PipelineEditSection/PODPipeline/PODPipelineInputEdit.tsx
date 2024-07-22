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
  PODPipelineInputFieldType
} from "@pcd/passport-interface";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import {
  MdCheckCircleOutline,
  MdDateRange,
  MdDeleteOutline,
  MdKey,
  MdNumbers,
  MdShortText
} from "react-icons/md";
import { Point, Spreadsheet } from "react-spreadsheet";
import styled from "styled-components";
import {
  PODPipelineEditAction,
  PODPipelineEditActionType
} from "./PODPipelineEdit";
import { BooleanEditor, BooleanViewer } from "./cells/BooleanCell";
import { DateEditor, DateViewer } from "./cells/DateCell";
import { IntegerEditor, IntegerViewer } from "./cells/IntegerCell";
import { AddColumnModal } from "./modals/AddColumnModal";
import { DeleteColumnDialog } from "./modals/DeleteColumnDialog";

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

type MenuInputProps = Omit<UseMenuItemProps & InputProps, "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => boolean;
};

function MenuInput({
  onChange,
  value,
  validate,
  ...rest
}: MenuInputProps): ReactNode {
  const { role } = useMenuItem(rest);
  const navigationKeys = ["ArrowUp", "ArrowDown", "Escape"];
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(validate(value));

  const onLocalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      setIsValid(validate(e.target.value));
    },
    [validate]
  );
  const onBlur = useCallback(() => {
    if (isValid) {
      onChange(localValue);
    }
  }, [localValue, onChange, isValid]);
  return (
    <Box px="3" py="1" role={role}>
      <Input
        value={localValue}
        onChange={onLocalChange}
        onBlur={onBlur}
        isInvalid={!isValid}
        colorScheme={isValid ? undefined : "red"}
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
  onDelete,
  onChangeColumnName
}: {
  columns: Record<string, InputColumn>;
  column: number;
  label?: React.ReactNode | null;
  onDelete: (name: string) => void;
  onChangeColumnName: (name: string) => void;
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

  const validateColumnName = useCallback(
    (name: string) => {
      return (
        name !== "" &&
        (!columnNames.includes(name) || name === columnNames[column])
      );
    },
    [columnNames, column]
  );

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
            <MenuInput
              value={columnNames[column]}
              onChange={onChangeColumnName}
              validate={validateColumnName}
            />
            <MenuDivider />
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

export function PODPipelineInputEdit({
  csvInput,
  dispatch
}: {
  csvInput: CSVInput;
  dispatch: React.Dispatch<PODPipelineEditAction>;
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

  const addRow = useCallback(() => {
    dispatch({
      type: PODPipelineEditActionType.AddInputRow
    });
  }, [dispatch]);

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
      dispatch({
        type: PODPipelineEditActionType.AddInputColumn,
        name,
        columnType: type
      });
      closeAddColumnModal();
    },
    [dispatch, closeAddColumnModal]
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
    dispatch({
      type: PODPipelineEditActionType.DeleteInputColumn,
      name: columnToDeleteName
    });
    setColumnToDeleteName("");
    closeDeleteColumnModal();
  }, [closeDeleteColumnModal, columnToDeleteName, dispatch]);

  const onChangeColumnName = useCallback(
    (name: string, column: number) => {
      dispatch({
        type: PODPipelineEditActionType.RenameInputColumn,
        name: Object.keys(columns)[column],
        newName: name
      });
    },
    [columns, dispatch]
  );

  const CustomColumnIndicator = useCallback(
    (props: { column: number; label?: React.ReactNode | null }) => {
      return (
        <ColumnIndicator
          columns={columns}
          onDelete={onDeleteColumn}
          onChangeColumnName={(name) => onChangeColumnName(name, props.column)}
          {...props}
        />
      );
    },
    [columns, onChangeColumnName, onDeleteColumn]
  );

  const updateCell = useCallback(
    (
      prevCell: { value: InputValue } | null,
      nextCell: { value: InputValue } | null,
      coords: Point | null
    ) => {
      if (coords && nextCell) {
        const row = csvInput.getRows()[coords.row];
        if (row) {
          const column = Object.values(columns)[coords.column];
          if (column && column.getValue(row) !== nextCell.value) {
            dispatch({
              type: PODPipelineEditActionType.UpdateInputCell,
              rowIndex: coords.row,
              columnName: column.getName(),
              value: nextCell.value
            });
          }
        }
      }
    },
    [columns, csvInput, dispatch]
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
        // onChange={(data): void => {
        //   setData(data);
        // }}
        onCellCommit={updateCell}
        ColumnIndicator={CustomColumnIndicator}
        HeaderRow={CustomHeaderRow}
        Row={Row}
        darkMode={true}
        data={data}
        columnLabels={Object.keys(columns)}
        className={"sheet"}
      />
      <VStack spacing={2} alignItems={"start"}>
        <Button
          onClick={addRow}
          leftIcon={<Icon as={PlusSquareIcon} w={4} h={4} />}
          colorScheme="blue"
        >
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
