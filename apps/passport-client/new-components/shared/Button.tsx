import * as React from "react";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";

type BtnVariant = "primary" | "secondary" | "danger";

const getBtnVariant = (variant: BtnVariant): typeof BtnBase => {
  switch (variant) {
    case "secondary":
      return BtnSecondary;
    case "danger":
      return BtnDanger;
    default:
      return BtnBase;
  }
};

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
}
export const Button2 = React.forwardRef(
  (btnProps: BtnProps, ref: React.ForwardedRef<HTMLButtonElement>) => {
    const Btn = getBtnVariant(btnProps.variant ?? "primary");
    return <Btn {...btnProps} ref={ref} />;
  }
);

const buttonStyle = css`
  user-select: none;
  word-break: break-word;
  width: 100%;
  height: 54px;
  padding: 12px;
  color: #fff;
  border: none;
  border-radius: 200px;
  font-weight: 500;
  background: var(--core-accent);
  opacity: 1;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: Rubik;
  font-size: 18px;

  &:hover {
    background: var(--core-accent);
  }
  &:active:not([disabled]) {
    opacity: 0.9;
  }
`;

const disabledCSS = css`
  cursor: not-allowed;
  opacity: 0.5;
`;

export const BtnBase = styled.button`
  ${buttonStyle}
  ${({ disabled }): FlattenSimpleInterpolation | undefined =>
    disabled === true ? disabledCSS : undefined}
}
`;

const BtnSecondary = styled(BtnBase)`
  color: var(--text-primary);
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  &:hover {
    background: hsl(0, 0%, 98%);
  }
`;

const BtnDanger = styled(BtnBase)`
  color: #fff;
  background: var(--new-danger);
  &:hover {
    background: hsl(0, 100%, 57%);
  }
`;
