import { Box, Input, UseMenuItemProps, useMenuItem } from "@chakra-ui/react";
import { InputProps } from "chakra-react-select";
import { ReactNode, useCallback, useState } from "react";

type MenuInputProps = Omit<
  UseMenuItemProps & Partial<InputProps>,
  "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
  validate: (value: string) => boolean;
};

/**
 * In-line editor that can appear in pop-up menus.
 */
export function MenuInput({
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
        {...rest}
        size="md"
        onKeyDown={(e) => {
          if (!navigationKeys.includes(e.key)) {
            e.stopPropagation();
          }
        }}
      />
    </Box>
  );
}
