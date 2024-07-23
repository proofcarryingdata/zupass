import { ChevronDownIcon } from "@chakra-ui/icons";
import {
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Portal
} from "@chakra-ui/react";
import { PODPipelineInputFieldType } from "@pcd/passport-interface";
import { ReactNode, useCallback, useMemo } from "react";
import {
  MdCheckCircleOutline,
  MdDateRange,
  MdDeleteOutline,
  MdKey,
  MdNumbers,
  MdShortText
} from "react-icons/md";
import { MenuInput } from "./MenuInput";

export function ColumnIndicator({
  columns,
  column,
  label,
  onDelete,
  onChangeColumnName
}: {
  columns: Record<string, { type: PODPipelineInputFieldType }>;
  column: number;
  label?: React.ReactNode | null;
  onDelete: (name: string) => void;
  onChangeColumnName: (name: string) => void;
}): ReactNode {
  const columnNames = useMemo(() => Object.keys(columns), [columns]);
  // Select an icon for the column based on the column's data type
  const icon = useMemo(() => {
    // Annoyingly react-spreadsheet will sometimes try to render a column that
    // has been deleted, so return a dummy icon for that.
    if (column >= columnNames.length) {
      return <Icon />;
    }
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
