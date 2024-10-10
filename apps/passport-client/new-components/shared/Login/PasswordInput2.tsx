import EyeIcon from "@heroicons/react/16/solid/EyeIcon";
import EyeSlashIcon from "@heroicons/react/16/solid/EyeSlashIcon";
import { ForwardedRef, forwardRef, useState } from "react";
import { Input2, NewInputProps } from "../Input";

export const PasswordInput2 = forwardRef(
  (props: NewInputProps, ref: ForwardedRef<HTMLInputElement>): JSX.Element => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input2
        {...props}
        type={!showPassword ? "password" : "text"}
        ref={ref}
        endIcon={
          !showPassword ? (
            <EyeSlashIcon
              onClick={() => setShowPassword(true)}
              color="#8B94AC"
            />
          ) : (
            <EyeIcon onClick={() => setShowPassword(false)} color="#8B94AC" />
          )
        }
      />
    );
  }
);
