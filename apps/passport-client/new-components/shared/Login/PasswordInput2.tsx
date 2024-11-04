import EyeIcon from "@heroicons/react/16/solid/EyeIcon";
import EyeSlashIcon from "@heroicons/react/16/solid/EyeSlashIcon";
import { ForwardedRef, forwardRef } from "react";
import { Input2, NewInputProps } from "../Input";

interface PasswordInputProps extends NewInputProps {
  showPassword: boolean;
  onTogglePassword: () => void;
}

export const PasswordInput2 = forwardRef(
  (
    props: PasswordInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ): JSX.Element => {
    const { showPassword, onTogglePassword, ...inputProps } = props;

    return (
      <Input2
        {...inputProps}
        type={!showPassword ? "password" : "text"}
        ref={ref}
        endIcon={
          !showPassword ? (
            <EyeSlashIcon
              onClick={onTogglePassword}
              color="#8B94AC"
              cursor={"pointer"}
            />
          ) : (
            <EyeIcon
              onClick={onTogglePassword}
              color="#8B94AC"
              cursor={"pointer"}
            />
          )
        }
      />
    );
  }
);
