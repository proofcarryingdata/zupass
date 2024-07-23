import { PlusSquareIcon } from "@chakra-ui/icons";
import { Button, Icon, VStack, useDisclosure } from "@chakra-ui/react";
import {
  PODPipelineDefinition,
  PODPipelineInputFieldType,
  PODPipelineOptions,
  parseCSV
} from "@pcd/passport-interface";
import React, { ReactNode, useCallback, useMemo, useState } from "react";
import { CellBase, Matrix, Spreadsheet } from "react-spreadsheet";
import styled from "styled-components";
import { AddColumnModal } from "./modals/AddColumnModal";
import { DeleteColumnDialog } from "./modals/DeleteColumnDialog";
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
  [PODPipelineInputFieldType.UUID]: {
    DataViewer: UUIDViewer,
    DataEditor: UUIDEditor
  },
  [PODPipelineInputFieldType.String]: {
    DataViewer: StringViewer,
    DataEditor: StringEditor
  }
};

/**
 * Convert the parsed CSV to a matrix of cells for use by react-spreadsheet.
 * @param parsed The parsed CSV
 * @param options The pipeline options
 * @returns The matrix of cells
 */
function parsedCSVToMatrix(
  parsed: string[][],
  options: PODPipelineOptions
): Matrix<CellBase<string>> {
  const configuredColumnTypes = Object.values(options.input.columns).map(
    (column) => column.type
  );
  // Remove the header row
  parsed.shift();
  return parsed.map((row) =>
    row.map((cell, index) => ({
      value: cell,
      ...COLUMN_CELLS[configuredColumnTypes[index]].DataViewer
    }))
  );
}

export function PODPipelineInputEdit({
  dispatch,
  definition
}: {
  dispatch: React.Dispatch<PODPipelineEditAction>;
  definition: PODPipelineDefinition;
}): ReactNode {
  const columns = useMemo(() => definition.options.input.columns, [definition]);
  const data = useMemo(
    () => parseCSV(definition.options),
    [definition.options]
  );
  const spreadsheetData = useMemo(
    () => parsedCSVToMatrix(data, definition.options),
    [data, definition.options]
  );

  const addRow = useCallback(() => {
    dispatch({
      type: PODPipelineEditActionType.AddInputRow,
      csvData: data
    });
  }, [dispatch, data]);

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
        columnType: type,
        csvData: data
      });
      closeAddColumnModal();
    },
    [dispatch, data, closeAddColumnModal]
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
      name: columnToDeleteName,
      csvData: data
    });
    setColumnToDeleteName("");
    closeDeleteColumnModal();
  }, [closeDeleteColumnModal, columnToDeleteName, data, dispatch]);

  const onChangeColumnName = useCallback(
    (name: string, column: number) => {
      dispatch({
        type: PODPipelineEditActionType.RenameInputColumn,
        name: Object.keys(columns)[column],
        newName: name,
        csvData: data
      });
    },
    [columns, data, dispatch]
  );

  const CustomHeaderRow = useCallback(
    (props: React.PropsWithChildren) => {
      return <HeaderRow {...props} onAddColumn={openAddColumnModal} />;
    },
    [openAddColumnModal]
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
        columnNames={Object.keys(columns)}
      />
      <Spreadsheet
        ColumnIndicator={CustomColumnIndicator}
        HeaderRow={CustomHeaderRow}
        Row={Row}
        darkMode={true}
        data={spreadsheetData}
        columnLabels={Object.keys(columns)}
        className={"sheet"}
        onChange={(data) => {
          dispatch({
            type: PODPipelineEditActionType.UpdateInputCSV,
            data: data.map((row) => row.map((cell) => cell?.value ?? ""))
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
