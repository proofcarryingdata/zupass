import EyeIcon from "@heroicons/react/24/solid/EyeIcon";
import EyeSlashIcon from "@heroicons/react/24/solid/EyeSlashIcon";
import { ForwardedRef, forwardRef, useState } from "react";
import styled from "styled-components";
import { Input2, NewInputProps } from "../Input";

export const PasswordInput2 = forwardRef(
  (props: NewInputProps, ref: ForwardedRef<HTMLInputElement>): JSX.Element => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <PasswordInputContainer>
        <Input2
          {...props}
          type={!showPassword ? "password" : "text"}
          ref={ref}
        />
        <EyeIconContainer>
          {!showPassword ? (
            <EyeSlashIcon
              onClick={() => setShowPassword(true)}
              color="#8B94AC"
            />
          ) : (
            <EyeIcon onClick={() => setShowPassword(false)} color="#8B94AC" />
          )}
        </EyeIconContainer>
      </PasswordInputContainer>
    );
  }
);

const PasswordInputContainer = styled.div`
  display: flex;
  width: 100%;
  position: relative;
`;

const EyeIconContainer = styled.div`
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
`;
