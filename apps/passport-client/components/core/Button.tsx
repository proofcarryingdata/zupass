import * as React from "react";
import { Link } from "react-router-dom";
import styled, { FlattenSimpleInterpolation, css } from "styled-components";

export function Button({
  children,
  onClick,
  style,
  type,
  size,
  disabled
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: "primary" | "secondary" | "danger";
  size?: "large" | "small";
  type?: "submit" | "button" | "reset";
  disabled?: boolean;
}): JSX.Element {
  const Btn =
    style === "danger"
      ? BtnDanger
      : style === "secondary"
      ? BtnSecondary
      : BtnBase;
  return (
    <Btn type={type} size={size} onClick={onClick} disabled={disabled}>
      {children}
    </Btn>
  );
}

const buttonStyle = `
  user-select: none;
  word-break: break-word;
  width: 100%;
  padding: 12px;
  color: var(--bg-dark-primary);
  border: none;
  border-radius: 99px;
  font-size: 16px;
  font-weight: 600;
  background: var(--accent-dark);
  opacity: 1;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;

  &:hover {
    background: var(--accent-darker);
  }
  &:active:not([disabled]) {
    opacity: 0.9;
  }
`;

export const BtnBase = styled.button<{ size?: "large" | "small" }>`
  ${buttonStyle}

  ${({ disabled }): FlattenSimpleInterpolation =>
    disabled === true
      ? css`
          cursor: not-allowed;
          opacity: 0.5;
        `
      : css``}

  ${({ size }: { size?: "large" | "small" }): FlattenSimpleInterpolation =>
    size === undefined || size === "large"
      ? css``
      : css`
          height: unset;
          width: unset;
          display: inline-flex;
          padding: 8px 16px;
          border-radius: 32px;
        `}
`;

const BtnDanger = styled(BtnBase)`
  color: #fff;
  background: var(--danger);
  &:hover {
    background: var(--danger-lite);
  }
`;

const BtnSecondary = styled(BtnBase)`
  color: #fff;
  background: #696969;
  &:hover {
    background: #7a7a7a;
  }
`;

export const LinkButton = styled(Link)<{ $primary?: boolean }>`
  ${buttonStyle}

  ${({ $primary }: { $primary?: boolean }): FlattenSimpleInterpolation => css`
    color: var(--bg-dark-primary) !important;
    display: block;
    width: 100%;
    text-align: center;
    text-decoration: none;

    ${!$primary &&
    css`
      color: #fff !important;
      background: #696969;
      &:hover {
        background: #7a7a7a;
      }
    `}
  `}
`;

export const CircleButton = styled.button<{
  diameter: number;
  padding: number;
}>`
  ${(p): string => {
    const size = p.diameter + 2 * p.padding + "px";
    return `width: ${size};height: ${size};`;
  }};
  cursor: pointer;
  border-radius: 99px;
  border: none;
  margin: 0;
  padding: ${(p): number => p.padding}px;
  background: transparent;
  user-select: none;

  img {
    -webkit-touch-callout: none;
    user-select: none;
    user-drag: none;
  }

  &:hover {
    background: rgba(var(--white-rgb), 0.05);
  }

  &:active {
    background: rgba(var(--white-rgb), 0.1);
  }
`;
