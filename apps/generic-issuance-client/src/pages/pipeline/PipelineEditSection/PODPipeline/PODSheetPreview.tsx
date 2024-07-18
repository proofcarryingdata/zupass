import { ChevronDownIcon, PlusSquareIcon } from "@chakra-ui/icons";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  FormControl,
  FormLabel,
  Icon,
  Input,
  InputProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  Select,
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
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { MdDeleteOutline } from "react-icons/md";
import { Matrix, Mode, Spreadsheet } from "react-spreadsheet";
import styled from "styled-components";
import { BooleanEditor, BooleanViewer } from "./cells/BooleanCell";
import { DateEditor, DateViewer } from "./cells/DateCell";
import { IntegerEditor, IntegerViewer } from "./cells/IntegerCell";

const COLUMN_DEFAULTS = {
  [PODPipelineInputFieldType.String]: "",
  [PODPipelineInputFieldType.Integer]: "0",
  [PODPipelineInputFieldType.Boolean]: "false",
  [PODPipelineInputFieldType.Date]: "",
  [PODPipelineInputFieldType.UUID]: ""
};

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
  [PODPipelineInputFieldType.UUID]: {},
  [PODPipelineInputFieldType.String]: {}
};

type HeaderRowProps = React.PropsWithChildren & {
  onAddColumn: () => void;
};

function DeleteColumnDialog({
  isOpen,
  onClose,
  onDelete,
  name
}: {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  name: string;
}): ReactNode {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Column
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure? This will delete all data in the{" "}
            <strong>{name}</strong> column.
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onDelete} ml={3}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

function AddColumnModal({
  onAddColumn,
  isOpen,
  onClose,
  columns
}: {
  onAddColumn: (name: string, type: PODPipelineInputFieldType) => void;
  isOpen: boolean;
  onClose: () => void;
  columns: Record<string, InputColumn>;
}): ReactNode {
  const [name, setName] = useState("");
  const [type, setType] = useState<PODPipelineInputFieldType | undefined>();
  useEffect(() => {
    setName("");
    setType(undefined);
  }, [isOpen]);
  const columnNames = useMemo(() => new Set(Object.keys(columns)), [columns]);
  const invalidInput =
    name === "" || type === undefined || columnNames.has(name);
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Modal Title</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={2}>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Enter the name for the new column"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  placeholder="Select the type for the new column"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as PODPipelineInputFieldType)
                  }
                >
                  <option value="string">String</option>
                  <option value="integer">Integer</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="uuid">UUID</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme={invalidInput ? "gray" : "blue"}
              mr={3}
              disabled={invalidInput}
              onClick={() => {
                if (!invalidInput) onAddColumn(name, type);
              }}
            >
              Add Column
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

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
  columnNames,
  column,
  label,
  onDelete
}: {
  columnNames: string[];
  column: number;
  label?: React.ReactNode | null;
  onDelete: (name: string) => void;
}): ReactNode {
  return (
    <th>
      <Menu>
        <MenuButton w="100%" as={Button} rightIcon={<ChevronDownIcon />}>
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
    // if (onChange) {
    //   const newCsv = stringify([...parsed, parsed[0].map(() => "")]);
    //   onChange(newCsv);
    // }
  }, []);

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
          columnNames={Object.keys(columns)}
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
