import EyeIcon from "@heroicons/react/16/solid/EyeIcon";
import EyeSlashIcon from "@heroicons/react/16/solid/EyeSlashIcon";
import { ForwardedRef, forwardRef, useState } from "react";
import { Input2, NewInputProps } from "../Input";

interface PasswordInputProps extends NewInputProps {
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export const PasswordInput2 = forwardRef(
  (
    props: PasswordInputProps,
    ref: ForwardedRef<HTMLInputElement>
  ): JSX.Element => {
    const [localShowPassword, setLocalShowPassword] = useState(false);
    const { showPassword, onTogglePassword, ...inputProps } = props;

    // Use local state if not provided
    const isPasswordVisible = showPassword ?? localShowPassword;
    const handleToggle = (): void => {
      if (onTogglePassword) {
        onTogglePassword();
      } else {
        setLocalShowPassword((prev) => !prev);
      }
    };

    return (
      <Input2
        {...inputProps}
        type={!isPasswordVisible ? "password" : "text"}
        ref={ref}
        endIcon={
          !isPasswordVisible ? (
            <EyeSlashIcon
              onClick={handleToggle}
              color="#8B94AC"
              cursor="pointer"
            />
          ) : (
            <EyeIcon onClick={handleToggle} color="#8B94AC" cursor="pointer" />
          )
        }
      />
    );
  }
);
