import { PlusSquareIcon } from "@chakra-ui/icons";
import { Button } from "@chakra-ui/react";
import { ReactNode } from "react";

type HeaderRowProps = React.PropsWithChildren & {
  onAddColumn: () => void;
};

export function HeaderRow(props: HeaderRowProps): ReactNode {
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

export function Row(props: React.PropsWithChildren): ReactNode {
  return (
    <tr {...props}>
      {props.children}
      <td></td>
    </tr>
  );
}
