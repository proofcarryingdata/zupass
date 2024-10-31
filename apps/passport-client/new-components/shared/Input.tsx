import { ForwardedRef, forwardRef, InputHTMLAttributes, Ref } from "react";
import styled, { css, FlattenSimpleInterpolation } from "styled-components";
import { Typography } from "./Typography";

export interface NewInputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "primary" | "secondary";
  error?: string;
  endIcon?: React.ReactNode;
  hideArrows?: boolean;
  rightIconSize?: number;
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
  box-shadow: none;
`;

const noArrowsCSS = css`
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  & {
    -moz-appearance: textfield;
  }
`;

export const BigInput2 = styled.input<{
  error?: string;
  hideArrows?: boolean;
  variant: "primary" | "secondary";
  rightIconSize?: number;
}>`
  width: 100%;
  height: 54px;
  border-radius: 200px;
  padding: 8px 24px;
  padding-right: ${({ rightIconSize }): string =>
    rightIconSize ? `${rightIconSize + 24}px` : "24px"};
  font-size: 16px;
  font-weight: 400;
  border: 1px solid rgba(var(--white-rgb), 0.3);
  background: white;
  color: var(--text-primary);
  box-shadow: 0px 1px 2px 0px #0000000d;
  overflow: hidden;
  text-overflow: ellipsis;

  ::placeholder {
    color: var(--text-tertiary);
  }

  &:disabled {
    user-select: none;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.05);
  }

  &:focus,
  &:active,
  &:focus-visible,
  &:focus-within {
    outline: 2px solid var(--core-accent);
  }

  ${({ error }): FlattenSimpleInterpolation | undefined => {
    if (error) return errorCSS;
  }}

  ${({ variant }): FlattenSimpleInterpolation | undefined => {
    if (variant === "secondary") return secondaryCSS;
  }}

  ${({ hideArrows }): FlattenSimpleInterpolation | undefined => {
    if (hideArrows) return noArrowsCSS;
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
  (inputProps: NewInputProps, ref: ForwardedRef<HTMLInputElement>) => {
    const { error, variant, rightIconSize } = inputProps;
    const defaultVariant = variant ?? "primary";
    const errorComp = error && (
      <Typography
        color="var(--new-danger)"
        style={{
          marginLeft: 12
        }}
      >
        {error}
      </Typography>
    );
    return (
      <ErrorContainer>
        <PasswordInputContainer>
          <BigInput2
            {...inputProps}
            variant={defaultVariant}
            rightIconSize={rightIconSize}
            ref={ref}
          />
          {inputProps.endIcon && (
            <IconContainer>{inputProps.endIcon}</IconContainer>
          )}
        </PasswordInputContainer>
        {error && errorComp}
      </ErrorContainer>
    );
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

const PasswordInputContainer = styled.div`
  display: flex;
  width: 100%;
  position: relative;
`;

const IconContainer = styled.div`
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
`;
