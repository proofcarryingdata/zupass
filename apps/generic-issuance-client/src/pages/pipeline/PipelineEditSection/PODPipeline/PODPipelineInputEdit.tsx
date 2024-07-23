import { PlusSquareIcon } from "@chakra-ui/icons";
import { Button, Icon, VStack, useDisclosure } from "@chakra-ui/react";
import {
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  updateInputCSV
} from "@pcd/passport-interface";
import { parse } from "csv-parse/sync";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { Spreadsheet } from "react-spreadsheet";
import styled from "styled-components";
import { ColumnIndicator } from "./sheet/ColumnIndicator";
import { HeaderRow, Row } from "./sheet/Rows";
import { BooleanEditor, BooleanViewer } from "./sheet/cells/BooleanCell";
import { DateEditor, DateViewer } from "./sheet/cells/DateCell";
import { IntegerEditor, IntegerViewer } from "./sheet/cells/IntegerCell";
import { StringEditor, StringViewer } from "./sheet/cells/StringCell";
import { UUIDEditor, UUIDViewer } from "./sheet/cells/UUIDCell";
import { PODPipelineEditAction, PODPipelineEditActionType } from "./state";

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
  // For UUIDs and strings, use the string editor
  [PODPipelineInputFieldType.UUID]: {
    DataViewer: UUIDViewer,
    DataEditor: UUIDEditor
  },
  [PODPipelineInputFieldType.String]: {
    DataViewer: StringViewer,
    DataEditor: StringEditor
  }
};

export function PODPipelineInputEdit({
  dispatch,
  definition
}: {
  dispatch: React.Dispatch<PODPipelineEditAction>;
  definition: PODPipelineDefinition;
}): ReactNode {
  const columns = useMemo(() => definition.options.input.columns, [definition]);
  const data = useMemo(() => {
    const parsed = parse(definition.options.input.csv, {});
    console.log(parsed);
    parsed.shift();
    const columnNames = Object.keys(columns);
    const maxCols = columnNames.length;
    return parsed.map((row: unknown[]) =>
      row.slice(0, maxCols).map((value, index) => ({
        value,
        ...COLUMN_CELLS[columns[columnNames[index]].type]
      }))
    );
  }, [definition.options.input.csv, columns]);
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

  // const updateCell = useCallback(
  //   (
  //     prevCell: { value: InputValue } | null,
  //     nextCell: { value: InputValue } | null,
  //     coords: Point | null
  //   ) => {
  //     if (coords && nextCell) {
  //       const row = csvInput.getRows()[coords.row];
  //       if (row) {
  //         const column = Object.values(columns)[coords.column];
  //         if (column) {
  //           const cell = column.getValue(row);
  //           const value = cell.valid ? cell.value : cell.input;
  //           const nextValue = nextCell.value
  //             ? nextCell.value.valid
  //               ? nextCell.value.value
  //               : nextCell.value.input
  //             : "";
  //           console.log({
  //             value,
  //             nextValue,
  //             column,
  //             coords,
  //             prevCell,
  //             nextCell
  //           });
  //           if (value !== nextValue) {
  //             dispatch({
  //               type: PODPipelineEditActionType.UpdateInputCell,
  //               rowIndex: coords.row,
  //               columnName: column.getName(),
  //               value: nextValue
  //             });
  //           }
  //         }
  //       }
  //     }
  //   },
  //   [columns, csvInput, dispatch]
  // );

  return (
    <Container>
      {/* <DeleteColumnDialog
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
      /> */}
      <Spreadsheet
        // onCellCommit={updateCell}
        ColumnIndicator={CustomColumnIndicator}
        HeaderRow={CustomHeaderRow}
        Row={Row}
        darkMode={true}
        data={data}
        columnLabels={Object.keys(columns)}
        className={"sheet"}
        onChange={(data) => {
          console.log(
            updateInputCSV(
              definition,
              data.map((row) => row.map((cell) => cell?.value))
            )
          );
          dispatch({
            type: PODPipelineEditActionType.UpdateInputCSV,
            data: data.map((row) => row.map((cell) => cell?.value))
          });
        }}
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

      input.Spreadsheet__data-editor--invalid {
        color: rgb(90, 27, 35, 1);
      }

      .Spreadsheet__data-viewer {
        padding: 8px;
        white-space: normal;
        word-break: normal;
      }

      td {
        padding: 0px;
      }

      td:has(.Spreadsheet__data-viewer--invalid) {
        background-color: rgb(90, 27, 35, 1);
      }

      th {
        padding: 0px;
      }
    }
  }
`;
