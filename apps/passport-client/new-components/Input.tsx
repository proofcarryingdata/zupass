import { InputHTMLAttributes, Ref } from "react";
import styled from "styled-components";

export const BigInput = styled.input`
  width: 100%;
  height: 54px;
  border-radius: 200px;
  padding: 8px 24px;
  font-size: 16px;
  font-weight: 400;
  border: 1px solid rgba(var(--white-rgb), 0.3);
  background: white;
  color: var(--text-tertiary);
  box-shadow: 0px 1px 2px 0px #0000000d;

  &::placeholder {
    color: var(--white-rgb);
  }

  &:disabled {
    user-select: none;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.05);
  }
`;

interface EmailCodeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export const ConfirmationCodeInput = (
  inputProps: EmailCodeInputProps
): JSX.Element => {
  return (
    <BigInput
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      {...inputProps}
    />
  );
};
