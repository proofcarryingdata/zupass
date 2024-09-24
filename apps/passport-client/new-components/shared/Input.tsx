import { ForwardedRef, InputHTMLAttributes, Ref, forwardRef } from "react";
import styled, { css } from "styled-components";
import { Typography } from "./Typography";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "primary" | "secondary";
  error?: string;
}

const errorCSS = css`
  border: 2px solid var(--new-danger);
  color: var(--new-danger);
  ::placeholder {
    color: var(--text-tertiary);
  }

  &:focus,
  &:active,
  &:focus-visible,
  &:focus-within {
    border: 2px solid var(--new-danger);
    outline: none;
  }
`;

const secondaryCSS = css`
  background: var(--secondary-input-bg);
`;

export const BigInput2 = styled.input<{
  error?: string;
  variant: "primary" | "secondary";
}>`
  width: 100%;
  height: 54px;
  border-radius: 200px;
  padding: 8px 24px;
  font-size: 16px;
  font-weight: 400;
  border: 1px solid rgba(var(--white-rgb), 0.3);
  background: white;
  color: var(--text-primary);
  box-shadow: 0px 1px 2px 0px #0000000d;
  ::placeholder {
    color: var(--text-tertiary);
  }

  &:disabled {
    user-select: none;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.05);
  }
  ${({ error }) => {
    if (error) return errorCSS;
  }}
  ${({ variant }) => {
    if (variant === "secondary") return secondaryCSS;
  }}
`;

const ErrorContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  gap: 8px;
  justify-content: flex-start;
`;

export const Input2 = forwardRef(
  (inputProps: InputProps, ref: ForwardedRef<HTMLInputElement>) => {
    const { error, variant } = inputProps;
    const defaultVariant = variant ?? "primary";
    if (error) {
      return (
        <ErrorContainer>
          <BigInput2 {...inputProps} variant={defaultVariant} ref={ref} />
          <Typography
            color="var(--new-danger)"
            style={{
              marginLeft: 12
            }}
          >
            {error}
          </Typography>
        </ErrorContainer>
      );
    }
    return <BigInput2 {...inputProps} variant={defaultVariant} ref={ref} />;
  }
);

interface EmailCodeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export const ConfirmationCodeInput = (
  inputProps: EmailCodeInputProps
): JSX.Element => {
  return (
    <Input2 type="text" inputMode="numeric" pattern="[0-9]*" {...inputProps} />
  );
};
